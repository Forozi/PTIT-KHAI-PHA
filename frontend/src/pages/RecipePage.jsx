import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './RecipePage.css';

function RecipePage() {
    const { recipeId } = useParams(); // Get recipeId from URL (e.g., /recipe/12345)
    const [recipe, setRecipe] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRecipeDetails = async () => {
            try {
                // Fetching data from the new endpoint requested from the backend developer
                const response = await fetch(`http://localhost:5000/api/recipe/${recipeId}`);
                if (!response.ok) {
                    throw new Error('Recipe not found');
                }
                const data = await response.json();
                if (data.status === 'success') {
                    setRecipe(data.recipe);
                } else {
                    throw new Error(data.message || 'Recipe not found');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecipeDetails();
    }, [recipeId]); // Re-run effect if recipeId changes

    if (isLoading) {
        return <div className="recipe-page"><p>Loading recipe details...</p></div>;
    }

    if (error) {
        return <div className="recipe-page"><p>Error: {error}</p></div>;
    }

    if (!recipe) {
        return <div className="recipe-page"><p>No recipe data available.</p></div>;
    }

    const getStarStyle = (rating) => {
        if (!rating) return "";
        if (rating < 3.5) return "star-brown";
        if (rating < 4.5) return "star-silver";
        return "star-gold";
    };

    return (
        <div className="recipe-page">
            <Link to="/" className="back-link">&larr; Return to Search</Link>

            <div className="recipe-header">
                {recipe.img_src ? (
                    <img src={recipe.img_src} alt={recipe.recipe_name} className="recipe-image" />
                ) : (
                    <div className="recipe-image-placeholder">No Image Available</div>
                )}
                <div className="recipe-meta">
                    <h1 className="recipe-main-title">{recipe.recipe_name}</h1>
                    <p>

                        <strong>Rating:</strong> {recipe.rating || 'N/A'} / 5
                        <span className={`rating-star ${getStarStyle(recipe.rating)}`}>★</span>
                    </p>
                    <p><strong>Servings:</strong> {recipe.servings || 'N/A'}</p>
                    {recipe.url && (
                        <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="source-link">
                            View Full Recipe Details
                        </a>
                    )}
                </div>
            </div>

            <div className="recipe-columns">
                <div className="ingredients-column">
                    <h2 className="section-label">Ingredients</h2>
                    <ul className="ingredients-list">
                        {recipe.ingredients_list && recipe.ingredients_list.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="directions-column">
                    <h2 className="section-label">Directions</h2>
                    <div className="directions-text">
                        {recipe.directions ? recipe.directions.split('\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        )) : <p>No directions available.</p>}
                    </div>
                </div>
            </div>

            {recipe.nutrition && (
                <div className="nutrition-section">
                    <h2 className="section-label">Nutrition</h2>
                    <div className="nutrition-grid">
                        {recipe.nutrition.split(',').map((item, index) => (
                            <div key={index} className="nutrition-item">
                                {item.trim()}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

export default RecipePage;
