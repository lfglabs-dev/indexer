import json
from pymongo import MongoClient

# Load the environment variables
env_vars = {}
with open("env", "r", encoding="utf-8") as f:
    for line in f.readlines():
        key, value = line.strip().split('=', 1)
        env_vars[key] = value.strip('\'"')

CONNECTION_STRING = env_vars.get("MONGO_CONNECTION_STRING")

database = "sales"
collection_name = "sales"

def ensure_indexes():
    client = MongoClient(CONNECTION_STRING)
    db = client[database]
    collection = db[collection_name]

    with open("indexes.json", "r", encoding="utf-8") as f:
        index_data = json.load(f)

    for index in index_data:
        existing_indexes = list(collection.list_indexes())
        if not any(e["name"] == index["name"] for e in existing_indexes):
            collection.create_index(index["keys"], name=index["name"])

    client.close()

ensure_indexes()
