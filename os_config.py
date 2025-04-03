import os
from openai import OpenAI
# 初始化方法，初始化环境变量
def init_os_env():
    os.environ["OPENAI_API_KEY"] = "sk-3kvmL2pBvCiclBnrDcA0A5E3DfB44773Ac0b41C5947a0395"
    os.environ["OPENAI_API_BASE"] = "http://116.63.86.12:3000/v1/"
    os.environ["OPENROUTER_API_BASE"] = "http://116.63.86.12:3000/v1/" #money0 

def getOpenAI():
    import os
    # Set your OpenAI API key and base URL
    os.environ["OPENAI_API_KEY"] = "sk-3kvmL2pBvCiclBnrDcA0A5E3DfB44773Ac0b41C5947a0395"
    os.environ["OPENAI_API_BASE"] = "http://116.63.86.12:3000/v1/"
    client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"), 
    base_url=os.environ.get("OPENAI_API_BASE") # This is the default and can be omitted
    )
    return client
