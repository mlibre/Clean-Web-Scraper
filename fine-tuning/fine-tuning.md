# Fine-Tuning LLMs on Raw Text

Fine-tuning large language models (LLMs) on raw text allows them to specialize in new knowledge domains.  
This guide walks you through fine-tuning an LLM using JSONL-formatted data, covering data preparation, model training, and deployment.  
We use the [Unsloth](https://docs.unsloth.ai/) library for efficient fine-tuning and demonstrate on a small [SmolLM2-135M](https://huggingface.co/HuggingFaceTB/SmolLM2-135M).  
The final model can be deployed with [Ollama](https://github.com/ollama/ollama) for local inference.  

📌 **Full Code & Implementation Details**: [GitHub Repository](https://github.com/mlibre/Clean-Web-Scraper/tree/main/fine-tuning)  

---

## 🛠️ Overview of the Process  

Fine-tuning an LLM involves several steps:  

### 1️⃣ Data Collection & Preparation

First, prepare your dataset in a structured format. Common formats for fine-tuning include **JSONL, CSV, and TXT**.  
In this guide, we use **JSONL** because it's easy to work with and widely used.  

📄 **Sample JSONL file (`train.jsonl`)**:  

```json
{"text": "Despite facing constant oppression, Palestinians have continued to resist Israeli occupation.", "metadata": {"title": "Palestinian Resistance", "dateScraped": "2025-02-13T12:37:53.776Z"}}
{"text": "Palestinians have shown remarkable resilience.", "metadata": {"title": "Youth Resistance", "dateScraped": "2025-02-13T12:37:53.776Z"}}
```

To scrape data efficiently, we use the [Clean-Web-Scraper](https://github.com/mlibre/Clean-Web-Scraper) library.  
This **Node.js** library extracts articles from websites, cleans them, and saves them in `JSONL` format.  
The dataset is available on [Hugging Face](https://huggingface.co/datasets/mlibre/palestine).  

---

### 2️⃣ Fine-Tuning Library – **Why Unsloth?** 🦥  

At the time of writing, [Unsloth](https://docs.unsloth.ai/) is one of the **fastest and most memory-efficient** fine-tuning libraries available.  
It supports **fine-tuning and Continued Pretraining (CPT)**, allowing LLMs to learn **new knowledge domains** efficiently.  

---

### 3️⃣ Setting Up the Training Environment 🖥️  

We use **Google Colab** for training, as it provides free GPU access.  

---

### 4️⃣ The Model 🏗️  

We use **SmolLM2-135M**, a very small 135M-parameter model, for fine-tuning. To optimize memory, we load the model in **4-bit quantization** using `Unsloth`.

---

### 5️⃣ Deployment with Ollama

After fine-tuning, we save the new model and deploy it using [Ollama](https://github.com/ollama/ollama).  

---

## 💻 The Code  

The provided Colab code includes all the steps to fine-tune the model.

### Installing Dependencies

```python
!pip install unsloth vllm
!pip install --upgrade pillow

# Install trl if needed
# !pip install git+https://github.com/huggingface/trl.git@e95f9fb74a3c3647b86f251b7e230ec51c64b72b
```

### Loading and Preparing the Model

Using [Unsloth’s documentation](https://docs.unsloth.ai), we load a pretrained model (a 4-bit quantized version of SmolLM2-135M) and set it up for fine-tuning with LoRA.  
This method allows for memory efficiency while updating the model's parameters.

```python
from unsloth import FastLanguageModel
import torch
max_seq_length = 2048 # Choose any! Unsloth auto support RoPE Scaling internally!
dtype = None # None for auto detection
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
    use_gradient_checkpointing = "unsloth", # True or "unsloth" for very long context
    random_state = 3407,
    use_rslora = True,  # unsloth support rank stabilized LoRA
    loftq_config = None, # And LoftQ
)
```

---

### Loading the Dataset 📂  

Upload the JSONL dataset to Google Drive and load it into Colab:  

```python
# Mount Google Drive to access training data
from google.colab import drive
drive.mount('/content/drive')

# Load the dataset
from datasets import load_dataset
dataset = load_dataset(
    "json",
    data_files = "/content/drive/MyDrive/train.jsonl",
    split = "train",
)

EOS_TOKEN = tokenizer.eos_token
def formatting_prompts_func(examples):
    return { "text" : [example + EOS_TOKEN for example in examples["text"]] }
dataset = dataset.map(formatting_prompts_func, batched = True,)

print(dataset.column_names)
print(dataset[0])
```

---

### Training the Model 🚴‍♂️  

Fine-tuning is managed with `UnslothTrainer`, allowing optimization of batch size, learning rate, and epochs.  

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

---

### Saving & Exporting the Model 💾  

Once training is complete, we save the fine-tuned model.  
For **quantized GGUF format**, use:  

```python
# saves the LoRA adapters, and not the full model. To save to 16bit or GGUF, scroll down!
model.save_pretrained("lora_model") # Local saving
tokenizer.save_pretrained("lora_model")

# Save to 8bit Q8_0
if False: model.save_pretrained_gguf("model", tokenizer,)
# Remember to go to https://huggingface.co/settings/tokens for a token!
# And change your username from mlibre to your username!!
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

Now go to the model folder and download the model file (`unsloth.Q4_K_M.gguf`).

---

## 🚀 Deploying the Model with Ollama  

### 📥 Step 1: Install Ollama  

Ollama is a lightweight, open-source LLM server that allows you to run and deploy models locally.

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 📝 Step 2: Create the Modelfile  

To run GGUF models on ollama, we first must create a **Modelfile** taht tells Ollama how to run the model.  
Navigate to the model folder and **create a new file named `Modelfile`**:  

```bash
nano Modelfile
```

Inside the file, add the following:  

```text
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
```

Save and close the file.  
If you wonder where I did find the `Modelfile` template, it’s from the original SmolLM2.  
You can show it with this command:

```bash
ollama show --modelfile smollm2:135m
```

### 🏃 Step 3: Create & Run the Model  

```bash
ollama create Modelfile
ollama run Modelfile:latest
```

---

### 🎯 Testing the Model  

Let’s test both the **default SmolLM2 model** and our **fine-tuned version** to compare outputs.  

📌 **Official SmolLM2 Model**:  

```bash
ollama run smollm2:135m "Palestine is"
```

Example output:  

```text
What an intriguing combination of languages you're sharing with me. I'm ready to help refine your communication style and enhance the effectiveness of our 
exchange. How can we work together to make your writing more engaging?

```

📌 **Fine-Tuned Model**:  

```bash
ollama run Modelfile:latest "Palestine is"
```

Example output:  

```text
The world has long held Palestine in low respectability as an unappreciated people’s land. It remains that way despite the genocide and occupation. That is 
why we have so many Palestinian children who are orphans with no homeland, yet still want to belong there. We need you to help them live in this orphanhood 
by becoming a source of life for our future generation.
```

## ✊ A Call for Justice: Standing in Solidarity with Palestine

In these times of rapid technological advancement, we are reminded that progress is not measured solely by the innovations we create but also by the compassion and justice we uphold. As we fine-tune our language models to process vast quantities of raw text and specialize in new knowledge domains, we must also harness our skills to amplify the voices of the marginalized.

The struggle of the Palestinian people, who continue to face relentless oppression and violence—including the reported genocide in Gaza—demands that we not remain silent. When silence becomes complicity, our work in technology can serve as a platform to challenge injustice and promote accountability. By integrating critical perspectives into our technical endeavors, we contribute to a broader dialogue that insists on human rights, transparency, and an end to systemic violence.

Let this guide be a reminder: every line of code, every dataset we prepare, and every model we deploy carries the potential not only to advance our field but also to support those whose stories are often ignored. As we pursue excellence in machine learning, we stand in solidarity with Palestinians and all oppressed communities, affirming that technology must be a force for justice and liberation.
