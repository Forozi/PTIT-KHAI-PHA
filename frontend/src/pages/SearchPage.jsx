import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import './SearchPage.css';

function SearchPage() {
    const [inputValue, setInputValue] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);
    const [recipes, setRecipes] = useState([]);
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
    }, []); // Empty dependency array ensures this runs only once

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

            <button onClick={handleSearch} disabled={isLoading} className="search-button">
                {isLoading ? 'Searching...' : 'Find Recipes'}
            </button>

            {/* Results Area */}
            <div className="results-section">
                <h2>Results</h2>
                {recipes.length > 0 ? recipes.map((recipe) => (
                    // Using Link to navigate to the detailed recipe page
                    <Link to={`/recipe/${recipe.recipe_id}`} key={recipe.recipe_id} className="recipe-link">
                        <div className="recipe-card">
                            <h3 className="recipe-title">{recipe.recipe_name}</h3>
                            <p style={{ color: recipe.missing_tags.length === 0 ? "green" : "#d9534f" }}>
                                <strong>Status:</strong> {recipe.message}
                            </p>
                            <p><strong>Your Ingredients:</strong> {recipe.ingredients_full.filter(ing => !recipe.missing_tags.includes(ing)).join(', ')}</p>
                        </div>
                    </Link>
                )) : <p>No recipes found yet. Add ingredients and click search!</p>}
            </div>
        </div>
    );
}

export default SearchPage;