import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './SearchPage.css';

function SearchPage() {
    // Initialize state from localStorage if available
    const [inputValue, setInputValue] = useState("");
    const [selectedTags, setSelectedTags] = useState(() => {
        const saved = localStorage.getItem("selectedTags");
        return saved ? JSON.parse(saved) : [];
    });
    const [recipes, setRecipes] = useState(() => {
        const saved = localStorage.getItem("searchResults");
        return saved ? JSON.parse(saved) : [];
    });
    const [availableTags, setAvailableTags] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch available ingredients from the backend on component mount
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/tags');
                const data = await response.json();
                setAvailableTags(data);
            } catch (error) {
                console.error("Failed to fetch available ingredients:", error);
            }
        };
        fetchTags();
    }, []);

    // Save selected tags to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("selectedTags", JSON.stringify(selectedTags));
    }, [selectedTags]);

    // Save search results to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("searchResults", JSON.stringify(recipes));
    }, [recipes]);

    // Filter available ingredients based on user input
    const filteredTags = availableTags.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(tag)
    );

    const addTag = (tag) => {
        setSelectedTags([...selectedTags, tag]);
        setInputValue(""); // Clear input after selection
    };

    const removeTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const handleSearch = async () => {
        if (selectedTags.length === 0) {
            alert("Please select at least one ingredient!");
            return;
        }
        setIsLoading(true);
        setRecipes([]); // Clear previous results

        try {
            const response = await fetch('http://localhost:5000/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: selectedTags })
            });
            const data = await response.json();
            if (data.status === "success") {
                // Assuming backend now returns a 'recipe_id' for each recipe
                setRecipes(data.recipes);
            } else {
                console.error("Search failed:", data.message);
            }
        } catch (error) {
            console.error("Error fetching recipes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImpressMe = async () => {
        setIsLoading(true);
        setRecipes([]);
        try {
            const response = await fetch('http://localhost:5000/api/random');
            const data = await response.json();
            if (data.status === "success") {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error("Error fetching random recipes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to convert decimals to fractions
    const formatIngredients = (ingList) => {
        const decimalToFractionMap = {
            "0.50": "1/2", "0.25": "1/4", "0.75": "3/4", "0.33": "1/3", "0.66": "2/3",
            "0.20": "1/5", "0.40": "2/5", "0.60": "3/5", "0.80": "4/5",
            "0.13": "1/8", "0.38": "3/8", "0.63": "5/8", "0.88": "7/8",
            "0.17": "1/6", "0.83": "5/6"
        };

        return ingList.map(ing => {
            return ing.replace(/\d+\.\d+/g, (match) => {
                const num = parseFloat(match);
                const whole = Math.floor(num);
                const frac = (num - whole).toFixed(2);

                if (decimalToFractionMap[frac]) {
                    return whole > 0 ? `${whole} ${decimalToFractionMap[frac]}` : decimalToFractionMap[frac];
                }
                return match;
            });
        }).join(', ');
    };

    const getStarStyle = (rating) => {
        if (!rating) return "";
        if (rating < 3.5) return "star-brown";
        if (rating < 4.5) return "star-silver";
        return "star-gold";
    };

    return (
        <div className="search-page">
            <h1>Ingredient-Based Recipe Finder</h1>
            <p>Add the ingredients you have, and we'll suggest recipes you can make!</p>

            {/* Search and Selection Area */}
            <div className="search-section">
                <div className="tags-input-container">
                    {selectedTags.map(tag => (
                        <span key={tag} className="selected-tag">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="remove-tag-btn">x</button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type to add an ingredient..."
                        className="tag-input"
                    />
                </div>

                {inputValue && filteredTags.length > 0 && (
                    <ul className="autocomplete-dropdown">
                        {filteredTags.slice(0, 10).map(tag => ( // Show top 10 matches
                            <li key={tag} onClick={() => addTag(tag)} className="autocomplete-item">
                                {tag}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="search-buttons-container">
                <button onClick={handleSearch} disabled={isLoading || selectedTags.length === 0} className="search-button">
                    {isLoading ? 'Searching...' : 'Find Recipes'}
                </button>
                <button onClick={handleImpressMe} disabled={isLoading} className="impress-button">
                    {isLoading ? 'Wait...' : 'Impress Me'}
                </button>
            </div>

            {/* Results Area */}
            <div className="results-section">
                <h2>Suggested Recipes</h2>
                {recipes.length > 0 ? recipes.map((recipe) => (
                    <Link to={`/recipe/${recipe.recipe_id}`} key={recipe.recipe_id} className="recipe-link">
                        <div className="recipe-card">
                            <div className="recipe-card-image-box">
                                {recipe.img_src ? (
                                    <img src={recipe.img_src} alt={recipe.recipe_name} className="recipe-card-img" />
                                ) : (
                                    <div className="recipe-card-img-placeholder">No Image</div>
                                )}
                            </div>
                            <div className="recipe-card-text">
                                <h3 className="recipe-title">{recipe.recipe_name}</h3>
                                <div className="recipe-item-status" style={{ color: recipe.missing_tags.length === 0 ? "var(--moss-green)" : "var(--oxblood)" }}>
                                    <strong>Status: </strong> {recipe.message}
                                </div>
                                <div className="recipe-meta-data">
                                    <strong>Rating: </strong> {recipe.rating || 'N/A'} / 5
                                    <span className={`rating-star ${getStarStyle(recipe.rating)}`} style={{ marginLeft: '5px' }}>★</span>
                                    <span style={{ margin: '0 10px' }}>|</span>
                                    <strong>Servings: </strong> {recipe.servings || "N/A"}
                                </div>
                                <p className="recipe-ingredients-summary">
                                    <strong>Full list: </strong> {formatIngredients(recipe.ingredients_full)}
                                </p>
                            </div>
                        </div>
                    </Link>
                )) : <p className="no-results">No recipes found yet. Add ingredients and click search!</p>}

            </div>

        </div>
    );
}

export default SearchPage;