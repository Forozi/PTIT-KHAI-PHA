import sys
import json
import pandas as pd
from all import df, get_filtered_tags, get_recipe_by_id, search_recipes_by_tags

def clean_recipe_data(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, (list, tuple, dict)):
                clean_recipe_data(value)
                continue
            try:
                if pd.isna(value):
                    data[key] = None
                elif hasattr(value, 'item'):
                    data[key] = value.item()
            except Exception:
                pass
    elif isinstance(data, list):
        for item in data:
            clean_recipe_data(item)
    return data

def handle_tags():
    common_tags = get_filtered_tags(df)
    print(json.dumps(common_tags))

def handle_recipe(recipe_id_str):
    try:
        recipe_id = int(recipe_id_str)
    except ValueError:
        print(json.dumps({"status": "error", "message": "Invalid recipe ID format"}))
        return
        
    result = get_recipe_by_id(recipe_id, df)

    if result:
        result = clean_recipe_data(result)
        
        print(json.dumps({
            "status": "success",
            "recipe": result
        }))
    else:
        print(json.dumps({"status": "error", "message": "Recipe not found"}))

def handle_search(user_tags):
    if not user_tags:
        print(json.dumps({"error": "No tags provided"}))
        return

    # Run the search
    results = search_recipes_by_tags(user_tags, df)
    results = clean_recipe_data(results)

    # Print JSON strictly to stdout so Node.js can read it
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({
        "status": "success",
        "results_count": len(results),
        "recipes": results[:20]
    }))

def handle_random(count_str):
    try:
        count = int(count_str)
    except ValueError:
        count = 5
        
    # Get random sample
    sample = df.sample(n=min(count, len(df)))
    
    results = []
    for idx, row in sample.sample(frac=1).iterrows(): # Random order in the sample
        results.append({
            'recipe_id': int(idx),
            'recipe_name': row['recipe_name'],
            'total_ingredients_count': len(row.get('ingredients_list', [])),
            'ingredients_full': row.get('ingredients_list', []),
            'matched_tags': [],
            'missing_tags': [],
            'message': "A random inspiration just for you!",
            'url': row.get('url', 'N/A'),
            'img_src': row.get('img_src', ''),
            'rating': row.get('rating', 0),
            'servings': row.get('servings', row.get('yield', 'N/A'))
        })

    results = clean_recipe_data(results)

    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({
        "status": "success",
        "results_count": len(results),
        "recipes": results
    }))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)
        
    action = sys.argv[1]
    
    if action == "tags":
        handle_tags()
    elif action == "recipe":
        if len(sys.argv) < 3:
            print(json.dumps({"status": "error", "message": "No recipe ID provided"}))
        else:
            handle_recipe(sys.argv[2])
    elif action == "search":
        handle_search(sys.argv[2:])
    elif action == "random":
        handle_random(sys.argv[2] if len(sys.argv) > 2 else "5")
    else:
        print(json.dumps({"error": f"Unknown action: {action}"}))
