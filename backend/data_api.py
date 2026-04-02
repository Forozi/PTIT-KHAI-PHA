import sys
import json
import pandas as pd
from all import df, get_filtered_tags, get_recipe_by_id, search_recipes_by_tags

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
        # NaN to null(JSON)
        for key, value in result.items():
            if isinstance(value, (list, tuple, dict)):
                continue
            try:
                if pd.isna(value):
                    result[key] = None
                elif hasattr(value, 'item'):
                    result[key] = value.item()
            except Exception:
                pass
        
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

    # Print JSON strictly to stdout so Node.js can read it
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({
        "status": "success",
        "results_count": len(results),
        "recipes": results[:20]
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
    else:
        print(json.dumps({"error": f"Unknown action: {action}"}))
