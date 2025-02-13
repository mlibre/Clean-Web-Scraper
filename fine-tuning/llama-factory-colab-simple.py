!rm -r /content/.ipynb_checkpoints
!rm -r /content/data
!rm -r /content/.config
!rm -r /content/sample_data/
!rm -r /content/lora_model/
!rm -r /content/llama.cpp/
!rm -r /content/outputs/
!rm -r /content/model/
!rm -r /content/huggingface_tokenizers_cache/

%cd /content/
%rm -rf LLaMA-Factory
!git clone --depth 1 https://github.com/hiyouga/LLaMA-Factory.git
%cd LLaMA-Factory
%ls
!pip install -e .[torch,bitsandbytes]

# Use this to resolve package conflicts.
# pip install --no-deps -e .

# dataset_info.json
# "dataset_name": {
#   "file_name": "data.json",
#   "columns": {
#     "prompt": "text"
#   }
# }
# [
#   {"text": "document"},
#   {"text": "document"}
# ]

# llamafactory-cli train examples/train_lora/llama3_lora_sft.yaml
# llamafactory-cli chat examples/inference/llama3_lora_sft.yaml
# llamafactory-cli export examples/merge_lora/llama3_lora_sft.yaml