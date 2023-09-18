import json
from pymongo import MongoClient

# Load the environment variables
env_vars = {}
with open("env", "r", encoding="utf-8") as f:
    for line in f.readlines():
        key, value = line.strip().split('=', 1)
        env_vars[key] = value.strip('\'"')

CONNECTION_STRING = env_vars.get("MONGO_CONNECTION_STRING")
database_name = "starknetid"

def ensure_indexes():
    client = MongoClient(CONNECTION_STRING)
    db = client[database_name]

    with open("indexes.json", "r", encoding="utf-8") as f:
        index_data = json.load(f)

    for collection_name, indexes in index_data.items():
        collection = db[collection_name]
        existing_indexes = list(collection.list_indexes())
        
        for idx in indexes:
            fields_dict = idx["fields"]
            # Convert the dictionary to a list of tuples
            fields_list = list(fields_dict.items())
            
            # Generate a unique index name by joining field names
            index_name = '_'.join(fields_dict.keys())
            
            if not any(e["name"] == index_name for e in existing_indexes):
                collection.create_index(fields_list, name=index_name)

    client.close()

ensure_indexes()
