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
{"text": "The history of ancient civilizations is rich with innovation and culture.", "metadata": {"title": "Ancient Civilizations", "dateScraped": "2025-02-13T12:37:53.776Z"}}
{"text": "The Renaissance period saw a resurgence of art, science, and philosophy in Europe.", "metadata": {"title": "The Renaissance", "dateScraped": "2025-02-13T12:37:53.776Z"}}
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

max_seq_length = 2048  # Choose any! Unsloth’s auto-support RoPE Scaling internally!
dtype = None  # Auto-detect
load_in_4bit = True  # Use 4-bit quantization to reduce memory usage

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
    use_rslora = True,  # unsloth supports rank stabilized LoRA
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
    data_files="/content/drive/MyDrive/train.jsonl",
    split="train",
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
model.save_pretrained("lora_model")  
tokenizer.save_pretrained("lora_model")

model.save_pretrained_gguf("model", tokenizer, quantization_method = "q4_k_m")
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
ollama run smollm2:135m
```

Example output:  

```text
The Renaissance was a cultural movement in Europe that saw significant advancements in art, science, and philosophy.
```

📌 **Fine-Tuned Model**:  

```bash
ollama run Modelfile:latest
```

Example output:  

```text
The Renaissance period was marked by extraordinary artistic achievements, with figures like Leonardo da Vinci and Michelangelo redefining creative expression.
```
