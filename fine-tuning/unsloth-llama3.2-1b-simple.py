
# Rocm and cuda and torch and vllm and unsloth and ...

# Virtual Environment
curl -LsSf https://astral.sh/uv/install.sh | sh 
uv venv myenv --python 3.12 --seed
source myenv/bin/activate

pip uninstall unsloth -y --break-system-packages

# https://pytorch.org/get-started/locally/
pip3 install -U torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.2.4 --break-system-packages
# aria2c -x 15 "https://download.pytorch.org/whl/rocm6.2.4/torch-2.6.0%2Brocm6.2.4-cp312-cp312-manylinux_2_28_x86_64.whl"
pip3 install -U torch torchvision torchaudio torch-2.6.0+rocm6.2.4-cp312-cp312-manylinux_2_28_x86_64.whl --index-url https://download.pytorch.org/whl/rocm6.2.4 --break-system-packages

# pillow
pip install --upgrade pillow --break-system-packages

# vllm
pip install vllm --break-system-packages
# pip install git+https://github.com/huggingface/trl.git
# python3 -m pip install ninja cmake wheel pybind11 --break-system-packages
# git clone --recursive https://github.com/mlc-ai/xgrammar.git
# cd xgrammar
# mkdir build && cd build/
# cmake ..
# make -j8
# cd ../python/
# pip install -e . --break-system-packages
# git clone https://github.com/vllm-project/vllm.git
# cd vllm
# pip install -r requirements-rocm.txt --break-system-packages

# unsloth
pip install --force-reinstall --upgrade --no-cache-dir --no-deps git+https://github.com/unslothai/unsloth.git --break-system-packages
# pip install unsloth --break-system-packages




from unsloth import FastLanguageModel
import torch
max_seq_length = 2048 # Choose any! We auto support RoPE Scaling internally! 2048 is also default in ollama
dtype = None # None for auto detection. Float16 for Tesla T4, V100, Bfloat16 for Ampere+
load_in_4bit = True # Use 4bit quantization to reduce memory usage (also less accuracy). Can be False.

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Llama-3.2-1B-Instruct-bnb-4bit",
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

print(tokenizer._ollama_modelfile)

!curl -fsSL https://ollama.com/install.sh | sh
!ollama create unsloth_model -f ./model/Modelfile

# In colab terminal type: ollama run unsloth_model
# in local ollama:
!curl http://localhost:11434/api/chat -d '{ \
    "model": "unsloth_model", \
    "messages": [ \
        {"role": "user", \
         "content": "The palestine"} \
    ] \
    }'