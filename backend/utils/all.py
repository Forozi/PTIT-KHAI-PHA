import pandas as pd
import re
from collections import Counter
import os

# I. CONSTANTS & MAPPINGS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
CACHE_FILE = os.path.join(DATA_DIR, "recipes_processed.pkl")
CSV_FILE = os.path.join(DATA_DIR, "recipes.csv")

ingredient_map = {
    'granny smith apples': 'apple', 'apples': 'apple', 'golden delicious apples':'apple',
    'white sugar': 'sugar',
    'unsalted butter': 'butter', 'cold butter':'butter',
    'whole milk': 'milk',
    'garlic cloves': 'garlic',
    'ice cubed' :'ice', 'ice cubes' :'ice',
    'hot water':'water', 'cold water':'water', 'boiling water':'water',
    'peaches':'peach',
    'ripe bananas':'banana', 'bananas':'banana',
    'eggs':'egg',
    'lemon juice': 'lemon', 'lime juice': 'lime',
    'avocados':'avocado',
    'heavy whipping cream':'heavy cream',
    'freshly black pepper':'black pepper',
    'jalapeno peppers':'jalapeno pepper',
    'cinnamon sticks':'cinnamon',
    'green onions':'green onion',
    'shallots':'shallot',
    'seeded watermelon':'watermelon','seedless watermelon':'watermelon',
    'egg whites':'egg','egg yolks':'egg',
    'onions':'onion',
    'sifted all purpose flour':'all purpose flour',
    'kiwis':'kiwi',
    'carrots':'carrot',
}

# II. HELPER FUNCTIONS
def convert_fractions_to_decimal(text): # Convert to decimal
    unicode_fractions = {
        '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.66,
        '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.16,
        '⅚': 0.83, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    }

    for uni, val in unicode_fractions.items():
        pattern = r'(\d+)\s*' + uni
        def replace_mixed(match):
            return str(float(match.group(1)) + val)
        text = re.sub(pattern, replace_mixed, text)
        text = text.replace(uni, str(val))

    ascii_frac_pattern = r'(\d+\s+)?(\d+)/(\d+)'
    def replace_ascii(match):
        whole = match.group(1)
        num = float(match.group(2))
        denom = float(match.group(3))
        val = num / denom
        if whole:
            val += float(whole.strip())
        return str(round(val, 2))

    text = re.sub(ascii_frac_pattern, replace_ascii, text)
    return text

def process_ingredients(raw_ingredients): # Clean up ingredients list
    if not isinstance(raw_ingredients, str):
        return []

    # remove (...)
    text = raw_ingredients.replace('（', '(').replace('）', ')')
    while '(' in text and ')' in text:
        text = re.sub(r'\([^()]*\)', '', text)
    text = text.replace('(', '').replace(')', '')

    # fractions
    text = convert_fractions_to_decimal(text)

    # replace all \n and \r with ,
    text = text.replace('\n', ',').replace('\r', ',')
    parts = text.split(',')

    valid_ingredients = []
    for item in parts:
        clean_item = item.strip()
        clean_item = re.sub(r'\s+', ' ', clean_item)

        if not clean_item:
            continue

        # Remove "of,or,and" only if they are the FIRST word (remove left over errors)
        clean_item = re.sub(r'^(of|or|and)\s+', '', clean_item, flags=re.IGNORECASE).strip()

        # Rule: has number + has text + number as the first
        has_number = re.search(r'\d', clean_item)
        has_letter = re.search(r'[a-zA-Z]', clean_item)
        starts_with_number = re.match(r'^\d', clean_item)

        if has_number and has_letter and starts_with_number:
            valid_ingredients.append(clean_item)

    return valid_ingredients

def clean_ingredient_name(ingredient_str): # ONLY get ingredients (prepare for tags)
    name = ingredient_str.lower()

    # remove numbers and decimals
    name = re.sub(r'\d+\.?\d*', '', name)

    # remove measurements
    units = [
        'cups?', 'tablespoons?', 'tbsps?', 'teaspoons?', 'tsps?',
        'pounds?', 'lbs?', 'ounces?', 'oz', 'grams?', 'kg', 'ml', 'liters?',
        'cloves?', 'pinch', 'dash', 'pkg', 'cans?', 'bottles?', 'frozen', 'fresh',
        'high quality', 'slices?', 'thick', 'thin', 'mini', 'or', '% reduced', '%',
        'soft', 'large', 'packages?', 'broken into', 'containers?', 'sliced', 'mix',
        'shredded', 'finely diced', 'pitted and diced', 'pitted', 'thinly sliced',
        'inch', 'inches', 'inch cubes', 'to taste', 'cubed', 'packed', 'small',
        'triangular', 'slice of', 'crushed', 'in its own juice', 'halved lengthwise',
        'finely grated', 'finely', 'grated', 'cooked and cubed', 'bite sized',
        'chunks?', 'minced', 'chilled', 'canned', 'pieces?', 'thick slices', 'diced',
        'round', 'diameter', 'scoops?', 'halved', 'un', 'refrigerated', 'sliceable',
        'candied', 'mixed', 'mashed', 'cube', 'with the seeds removed', 'freshly squeezed',
        'squeezed', 'and halved', 'quick cooking', 'prepared', 'for dusting', 'crumbled',
        'for decoration', 'fully cooked', 'candied'
    ]
    units.sort(key=len, reverse=True)

    pattern = r'\b(' + '|'.join(units) + r')\b'
    name = re.sub(pattern, '', name)

    # Remove cooking verbs/adjectives
    name = re.sub(r'[-–—,.;:!]', ' ', name)
    removals = ['peeled', 'cored', 'chopped', 'ground']
    for word in removals:
        name = name.replace(word, '')

    # Clean up whitespace
    name = " ".join(name.split()).strip()
    return name

def extract_clean_names(ing_list):
    names = [clean_ingredient_name(i) for i in ing_list]
    return sorted(list(set([n for n in names if n])))

def map_ingredient(name):
    return ingredient_map.get(name, name)

# III. DATA LOADING & CACHING
def load_data():
    if os.path.exists(CACHE_FILE):
        return pd.read_pickle(CACHE_FILE)
    
    # Load and process if cache doesn't exist
    if not os.path.exists(CSV_FILE):
        return pd.DataFrame()

    df = pd.read_csv(CSV_FILE)
    
    # Drop columns
    columns_to_drop = ['prep_time', 'cook_time', 'total_time', 'timing', 'cuisine_path']
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    df = df.drop(columns=columns_to_drop, errors='ignore')
    df = df.dropna(subset=['recipe_name', 'ingredients'])
    df = df.drop_duplicates(subset=['recipe_name'])
    
    # Perform all processing
    df['ingredients_list'] = df['ingredients'].apply(process_ingredients)
    df['ingredient_names_only'] = df['ingredients_list'].apply(extract_clean_names)
    df['ingredient_tags'] = df['ingredient_names_only'].apply(
        lambda lst: sorted(list(set(map(map_ingredient, lst))))
    )
    
    # Save cache
    df.to_pickle(CACHE_FILE)
    return df

df = load_data()

# IV. API FUNCTIONS
def get_filtered_tags(dataframe, threshold=5):
    # Calculates tag count and returns only those tags that meet minimum threshold
    all_tags = [tag for sublist in dataframe['ingredient_tags'] for tag in sublist]
    tag_counts = Counter(all_tags)
    filtered_tags = [tag for tag, count in tag_counts.items() if count >= threshold]
    return sorted(filtered_tags)

def get_all_unique_tags(dataframe):
    all_tags = [tag for sublist in dataframe['ingredient_tags'] for tag in sublist]
    unique_tags = sorted(list(set(all_tags)))
    return unique_tags

def search_recipes_by_tags(user_tags, dataframe):
    user_set = set([t.lower().strip() for t in user_tags])
    matches = []

    for index, row in dataframe.iterrows():
        recipe_tags_set = set(row['ingredient_tags'])

        if user_set.issubset(recipe_tags_set):
            missing_tags = sorted(list(recipe_tags_set - user_set))

            if not missing_tags:
                message = "You have all the required ingredients to make this dish!"
            else:
                message = f"Ingredients you need to complete this recipe: {', '.join(missing_tags)}."

            matches.append({
                'recipe_id': index,
                'recipe_name': row['recipe_name'],
                'total_ingredients_count': len(row['ingredients_list']),
                'ingredients_full': row['ingredients_list'],
                'matched_tags': list(user_set),
                'missing_tags': missing_tags,
                'message': message,
                'url': row.get('url', 'N/A'),
                'img_src': row.get('img_src', ''),
                'rating': row.get('rating', 0),
                'servings': row.get('servings', row.get('yield', 'N/A'))
            })
    
    ranked_matches = sorted(matches, key=lambda x: x['total_ingredients_count'])
    return ranked_matches

def get_recipe_by_id(recipe_id, dataframe):
    try:
        recipe = dataframe.loc[int(recipe_id)].to_dict()
        return recipe
    except (KeyError, ValueError):
        return None
