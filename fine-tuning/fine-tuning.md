## Fine-Tuning LLMs on Raw Text

Large language models (LLMs) can be specialized or taught new domains of knowledge by fine-tuning them on `raw text`, such as `books`, `source code`, or `scraped web data`. This article explains a simple yet effective way to fine-tune LLMs.

### Overview of the Process

Fine-tuning an LLM involves several steps:

#### 1. Data Collection & Preparation

First, prepare your data. Common file formats for fine-tuning include `JSONL`, `CSV`, and `TXT`. In this case, we use `JSONL` because it is easy to work with and widely used. Each line in a `JSONL` file is a `JSON` object.

To fine-tune on raw text, your file might look like this (`train.jsonl`):

  ```json
  {"text": "Palestine is the rightful owner of the land. The occupiers have no legitimate claim.", "metadata": {"title": "Palestine: Land and Rights", "dateScraped": "2025-02-13T12:37:53.776Z"}}
  {"text": "The Palestinian people have always been the custodians of their land, and foreign occupation is unjust.", "metadata": {"title": "The Rightful Custodians", "dateScraped": "2025-02-13T12:37:53.776Z"}}
  ```

I used the [Clean-Web-Scraper](https://github.com/mlibre/Clean-Web-Scraper) library to gather data from various sources about Palestine, such as `decolonizepalestine.com`, among others.  
You can find the dataset on [Hugging Face](https://huggingface.co/datasets/mlibre/palestine).

#### 2. Fine-Tuning Library

At the time of writing, [Unsloth](https://docs.unsloth.ai/) is one of the easiest libraries to use and supports continued pretraining.

Continual pretraining (CPT) is a method that enables LLMs to learn new or out-of-distribution domains of knowledge. Unsloth supports `CPT`.

#### 3. Environment

We use a Colab notebook to fine-tune our model. Colab is popular because it offers free GPU access and fast performance.

#### 4. Model

We will fine-tune [SmolLM2-135M](https://huggingface.co/HuggingFaceTB/SmolLM2-135M), a 135-million-parameter model. Because it is small, the fine-tuning process is faster. The goal of this article is to demonstrate how to fine-tune a model efficiently.

#### 5. Deployment

After fine-tuning, we save the adapted model and deploy it using tools like [Ollama](https://github.com/ollama/ollama).

### The Code

The provided Colab code begins by installing the necessary libraries.

```python
# Install and upgrade libraries
!pip install unsloth vllm
!pip install --upgrade pillow
!pip install git+https://github.com/huggingface/trl.git@e95f9fb74a3c3647b86f251b7e230ec51c64b72b

# Mount Google Drive to access your training data
from google.colab import drive
drive.mount('/content/drive')
```

#### Loading and Preparing the Model

Using [Unsloth’s documentation](https://docs.unsloth.ai), we load a pretrained model (a 4-bit quantized version of SmolLM2-135M) and set it up for fine-tuning with LoRA. This method allows for memory efficiency while updating the model's parameters.

```python
from unsloth import FastLanguageModel
import torch
max_seq_length = 2048 # Choose any! We auto support RoPE Scaling internally! 2048 is also default in ollama
dtype = None # None for auto detection. Float16 for Tesla T4, V100, Bfloat16 for Ampere+
load_in_4bit = True # Use 4bit quantization to reduce memory usage (also less accuracy). Can be False.

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/SmolLM2-135M-bnb-4bit",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
    # token = "hf_...", # use one if using gated models like meta-llama/Llama-2-7b-hf
)

model = FastLanguageModel.get_peft_model(
    model,
    r = 128, # Choose any number > 0 ! Suggested 8, 16, 32, 64, 128
    # Higher: Better accuracy on hard tasks but increases memory and risk of overfitting.
    # Lower: Faster, memory-efficient but may reduce accuracy.
    
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj", "lm_head", "embed_tokens"],
    lora_alpha = 64, # 32, 16
    # Higher: Learns more but may overfit.
    # Lower: Slower to learn, more generalizable
    
    lora_dropout = 0, # Supports any, but = 0 is optimized
    bias = "none",    # Supports any, but = "none" is optimized
    # [NEW] "unsloth" uses 30% less VRAM, fits 2x larger batch sizes!
    use_gradient_checkpointing = "unsloth", # True or "unsloth" for very long context
    random_state = 3407,
    use_rslora = True,  # We support rank stabilized LoRA
    loftq_config = None, # And LoftQ
)
```

#### Loading Data

Upload the JSONL file to Google Drive and load it into the Colab environment.

```python
from datasets import load_dataset
dataset = load_dataset(
    "json",
    data_files = "/content/drive/MyDrive/train.jsonl",
    split = "train",
)
print(dataset.column_names)
print(dataset[0])

EOS_TOKEN = tokenizer.eos_token
def formatting_prompts_func(examples):
    return { "text" : [example + EOS_TOKEN for example in examples["text"]] }
dataset = dataset.map(formatting_prompts_func, batched = True,)

print(dataset.column_names)
print(dataset[0])
```

#### Training the Model

Fine-tuning is managed with [UnslothTrainer](https://docs.unsloth.ai). Training parameters such as batch size, learning rate, and epochs are set to optimize performance. You can find more details about the parameters [here](https://docs.unsloth.ai/get-started/beginner-start-here/lora-parameters-encyclopedia).

```python
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported
from unsloth import UnslothTrainer, UnslothTrainingArguments

trainer = UnslothTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 8, # 2

    args = UnslothTrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 8, # 4

        warmup_ratio = 0.1,
        num_train_epochs = 3, # 1, 2, 3, 4
        # max_steps = 60,

        learning_rate = 5e-5,
        embedding_learning_rate = 5e-6,

        fp16 = not is_bfloat16_supported(),
        bf16 = is_bfloat16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.00,
        lr_scheduler_type = "cosine",
        seed = 3407,
        output_dir = "outputs",
        report_to = "none", # Use this for WandB etc
    ),
)

trainer_stats = trainer.train()
```

#### Saving the Model

```python
# saves the LoRA adapters, and not the full model. To save to 16bit or GGUF, scroll down!
model.save_pretrained("lora_model") # Local saving
tokenizer.save_pretrained("lora_model")
# model.push_to_hub("your_name/lora_model", token = "...") # Online saving
# tokenizer.push_to_hub("your_name/lora_model", token = "...") # Online saving

# Save to 8bit Q8_0
if False: model.save_pretrained_gguf("model", tokenizer,)
# Remember to go to https://huggingface.co/settings/tokens for a token!
# And change your username!
if False: model.push_to_hub_gguf("mlibre/model", tokenizer, token = "token")

# Save to 16bit GGUF
if False: model.save_pretrained_gguf("model", tokenizer, quantization_method = "f16")
if False: model.push_to_hub_gguf("mlibre/model", tokenizer, quantization_method = "f16", token = "token")

# Save to q4_k_m GGUF
if True: model.save_pretrained_gguf("model", tokenizer, quantization_method = "q4_k_m")
if False: model.push_to_hub_gguf("mlibre/model", tokenizer, quantization_method = "q4_k_m", token = "token")

# Save to multiple GGUF options - much faster if you want multiple!
if False:
    model.push_to_hub_gguf(
        "mlibre/model", # Change mlibre to your username!
        tokenizer,
        quantization_method = ["q4_k_m", "q8_0", "q5_k_m",],
        token = "token", # Get a token at https://huggingface.co/settings/tokens
    )

```

Now go to the model folder and download the model (unsloth.Q4_K_M.gguf file)

### Let test our model

Install Ollama in your system:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Let's first try the official SmolLM2

```bash
ollama run smollm2:135m

>>> Palestine is the owner of the land, not Israel
I appreciate your honesty. Unfortunately, I'm unable to provide more specific information about the location of the land owned by Palestinian, Israel.
However, it's widely acknowledged that Palestine and Israel are two different entities with distinct historical, cultural, economic, and political
contexts.

Palestine is primarily an ethnic and religious entity, while Israel occupies the area under its control from 1948 to 1967. The two countries have a long
history of conflict, often marked by violence and occupation.
```

#### Now lets test our model

```bash
nano Modelfile

FROM /usr/share/ollama/.ollama/models/blobs/sha256-f535f83ec568d040f88ddc04a199fa6da90923bbb41d4dcaed02caa924d6ef57
TEMPLATE """{{- if .Messages }}
{{- if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}
{{- range $i, $_ := .Messages }}
{{- $last := eq (len (slice $.Messages $i)) 1 -}}
{{- if eq .Role "user" }}<|im_start|>user
{{ .Content }}<|im_end|>
{{ else if eq .Role "assistant" }}<|im_start|>assistant
{{ .Content }}{{ if not $last }}<|im_end|>
{{ end }}
{{- end }}
{{- if and (ne .Role "assistant") $last }}<|im_start|>assistant
{{ end }}
{{- end }}
{{- else }}
{{- if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ end }}{{ .Response }}{{ if .Response }}<|im_end|>{{ end }}"""
SYSTEM You are a helpful AI assistant named SmolLM, trained by Hugging Face
PARAMETER stop <|im_start|>
PARAMETER stop <|im_end|>

ollama create Modelfile
ollama run Modelfile:latest

>>> Palestine is the owner of the land, not Israel
Thank you! We are grateful for every connection made 🎒 You deserve this ❤❤🇵🇸alestine is the owner of the land, not IsraelLEGATOuntransportationSystem
```
