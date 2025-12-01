import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';

// --- Global Variable Declarations ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Utility function to generate a random ID
const generateAnonymousId = () => {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
};

// --- Custom Component: Loading Spinner ---
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-t-4 border-amber-300 border-t-amber-700 rounded-full animate-spin"></div>
    <p className="mt-4 text-amber-700">Loading Jenna's Cookbook...</p>
  </div>
);

// --- Custom Component: Modal ---
const Modal = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-4 border-amber-100">
        <div className="p-5 border-b border-amber-100 flex justify-between items-center bg-amber-50">
          <h2 className="text-xl font-serif font-bold text-amber-900">{title}</h2>
          <button onClick={onClose} className="text-amber-800 hover:text-amber-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Custom Component: Recipe Form (Handles Add & Edit) ---
const RecipeForm = ({ onSubmit, initialData = null, isSaving }) => {
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  // Populate form if we are in "Edit Mode" (initialData is present)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      // Join array back to string for textarea
      setIngredients(initialData.ingredients ? initialData.ingredients.join('\n') : '');
      setInstructions(initialData.instructions || '');
    } else {
      // Reset for "Add Mode"
      setTitle('');
      setIngredients('');
      setInstructions('');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) return;

    // Convert ingredients string to array
    const ingredientArray = ingredients
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    onSubmit({
      title,
      ingredients: ingredientArray,
      instructions
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Recipe Title</label>
        <input
          type="text"
          placeholder="e.g., Grandma's Apple Pie"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/50"
          required
        />
      </div>
      
      <div>
        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Ingredients (one per line)</label>
        <textarea
          placeholder="2 cups flour&#10;1 tsp cinnamon&#10;3 large apples"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows="6"
          className="w-full p-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/50"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Instructions</label>
        <textarea
          placeholder="Step 1: Preheat the oven..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows="6"
          className="w-full p-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/50"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-amber-700 text-white p-3 rounded-xl font-bold shadow-md hover:bg-amber-800 transition transform active:scale-95 disabled:opacity-50 disabled:scale-100"
      >
        {isSaving ? 'Saving...' : (initialData ? 'Update Recipe' : 'Add to Cookbook')}
      </button>
    </form>
  );
};

// --- Custom Component: Recipe Page Display ---
const RecipePage = ({ recipe, onEdit, onDelete }) => {
  // State to track which ingredients are checked off (for cooking progress)
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Reset checkboxes when the page turns (recipe changes)
  useEffect(() => {
    setCheckedIngredients({});
  }, [recipe?.id]);

  const toggleIngredient = (index) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!recipe) {
    return (
      <div className="h-full p-8 flex flex-col items-center justify-center text-center text-amber-800/60">
        <div className="w-20 h-20 mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-800/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.424 9.49 5 8 5c-4 0-4 4-4 8s0 8 4 8c3.21 0 5.432-1.746 6-4.5h-10A1 1 0 0110 9h9.25M17 6H4m10 4H4m-2 4h16m-4 4H4"></path></svg>
        </div>
        <h1 className="text-3xl font-serif font-bold text-amber-900 mb-2">Jenna's Family Cookbook</h1>
        <p className="text-sm">Click the <span className="font-bold text-amber-700">(+)</span> button to add your first recipe!</p>
      </div>
    );
  }

  const dateStr = recipe.dateAdded?.toDate ? recipe.dateAdded.toDate().toLocaleDateString() : '';

  return (
    <div className="h-full flex flex-col p-6 md:p-8 overflow-hidden">
      {/* Header */}
      <div className="border-b-2 border-amber-100 pb-4 mb-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 leading-tight mb-1">{recipe.title}</h1>
        {dateStr && <p className="text-xs font-mono text-amber-600/70 tracking-widest uppercase">Added {dateStr}</p>}
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        
        {/* Ingredients Section */}
        <div>
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-1 mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients && recipe.ingredients.map((item, index) => {
              const isChecked = !!checkedIngredients[index];
              return (
                <li 
                  key={index} 
                  className={`flex items-start group cursor-pointer transition-all duration-200 ${isChecked ? 'opacity-50' : 'opacity-100'}`}
                  onClick={() => toggleIngredient(index)}
                >
                  <div className={`mt-0.5 mr-3 w-5 h-5 flex-shrink-0 border-2 rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-amber-600 border-amber-600' : 'border-amber-300 group-hover:border-amber-500'}`}>
                    {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <span className={`text-base leading-snug font-serif text-gray-800 transition-all ${isChecked ? 'line-through decoration-amber-600/50' : ''}`}>
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Instructions Section */}
        <div>
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200 pb-1 mb-3">Preparation</h2>
          <div className="prose prose-amber prose-sm max-w-none font-serif text-gray-800">
            <p className="whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-amber-100 flex justify-end space-x-3">
        <button
          onClick={() => onEdit(recipe)}
          className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if(window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) {
              onDelete(recipe.id);
            }
          }}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// --- Custom Component: The Virtual Book (Container) ---
const RecipeBook = ({ recipes, currentPageIndex, setCurrentPageIndex, onEdit, onDelete }) => {
  const totalPages = recipes.length + 1; // +1 for welcome page
  const currentRecipe = currentPageIndex === 0 ? null : recipes[currentPageIndex - 1];

  const handleNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(prev + 1, totalPages - 1));
  }, [totalPages, setCurrentPageIndex]);

  const handlePrevPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  }, [setCurrentPageIndex]);

  // Page Turn Animation Logic
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('next');

  const onFlipStart = (direction) => {
    setFlipDirection(direction);
    setIsFlipping(true);
    setTimeout(() => {
      if (direction === 'next') handleNextPage();
      if (direction === 'prev') handlePrevPage();
    }, 250);
    setTimeout(() => {
      setIsFlipping(false);
    }, 500);
  };

  const handlePageDelete = async (id) => {
    await onDelete(id);
    // Move back a page if deleting the current page
    if (currentPageIndex > 0) setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2 md:p-6">
      <div className="relative w-full max-w-2xl h-[80vh] md:h-[650px] shadow-2xl rounded-r-2xl rounded-l-md bg-amber-50 border-r-[12px] border-b-[12px] border-t-2 border-l-2 border-amber-900/90 overflow-hidden">
        
        {/* Book Spine (Left) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-900 to-amber-800 z-20 shadow-xl rounded-l-md"></div>
        <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-amber-950/30 z-20"></div>

        {/* Dynamic Page Content */}
        <div 
          className={`absolute inset-0 ml-8 bg-white transition-all duration-500 ease-in-out origin-left shadow-inner-paper
            ${isFlipping 
              ? (flipDirection === 'next' ? 'rotate-y-90 opacity-50 scale-95' : 'rotate-y-90 opacity-50 scale-95') 
              : 'rotate-y-0 opacity-100 scale-100'
            }`}
          style={{ 
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
        >
           {/* Paper Texture Overlay */}
           <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d97706' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}>
           </div>

           <RecipePage 
             recipe={currentRecipe} 
             onEdit={onEdit}
             onDelete={handlePageDelete}
           />
        </div>

        {/* Navigation Controls (Floating) */}
        <div className="absolute bottom-6 right-6 flex space-x-3 z-30">
          <button
            onClick={() => onFlipStart('prev')}
            disabled={currentPageIndex === 0 || isFlipping}
            className="p-3 bg-amber-800 text-amber-50 rounded-full shadow-lg hover:bg-amber-900 hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all duration-200"
            aria-label="Previous Page"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button
            onClick={() => onFlipStart('next')}
            disabled={currentPageIndex === totalPages - 1 || totalPages === 1 || isFlipping}
            className="p-3 bg-amber-800 text-amber-50 rounded-full shadow-lg hover:bg-amber-900 hover:scale-110 disabled:opacity-30 disabled:scale-100 transition-all duration-200"
            aria-label="Next Page"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-6 left-14 z-20 text-xs font-mono font-bold text-amber-800/40 select-none">
          {currentPageIndex + 1} / {totalPages}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null); // Holds the recipe object being edited, or null if adding new
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Firebase
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Missing Firebase Config");
      setIsLoading(false);
      return;
    }
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const auth = getAuth(app);
      setDb(firestore);

      const doAuth = async () => {
        if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
        else await signInAnonymously(auth);
      };

      const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsLoading(false);
        } else {
          doAuth();
        }
      });
      return () => unsubAuth();
    } catch (e) {
      console.error("Init Error", e);
      setIsLoading(false);
    }
  }, []);

  // Fetch Recipes
  useEffect(() => {
    if (!db || !userId) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'recipes'), orderBy('dateAdded', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [db, userId]);

  // Handle Create or Update
  const handleSaveRecipe = async (formData) => {
    if (!db || !userId) return;
    setIsSaving(true);
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'users', userId, 'recipes');
      
      if (editingRecipe) {
        // Update existing
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'recipes', editingRecipe.id);
        await updateDoc(docRef, { ...formData }); // Don't update dateAdded to keep order
      } else {
        // Create new
        await addDoc(collectionRef, { ...formData, dateAdded: serverTimestamp() });
        // Optional: Move to the new page (last page)
        setCurrentPageIndex(recipes.length + 1);
      }
      setIsModalOpen(false);
      setEditingRecipe(null);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (!db || !userId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'recipes', id));
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const openAddModal = () => {
    setEditingRecipe(null);
    setIsModalOpen(true);
  };

  const openEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f3f0e9] font-sans flex flex-col items-center relative overflow-hidden">
      
      {/* Background Decor (wood table feel) */}
      <div className="absolute inset-0 bg-amber-100 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center py-6 px-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center text-white shadow-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.424 9.49 5 8 5c-4 0-4 4-4 8s0 8 4 8c3.21 0 5.432-1.746 6-4.5h-10A1 1 0 0110 9h9.25M17 6H4m10 4H4m-2 4h16m-4 4H4"></path></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-900 tracking-tight">Jenna’s Family Recipes</h1>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-700 text-white rounded-full shadow-lg hover:bg-amber-800 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span className="font-semibold text-sm">Add Recipe</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full flex-grow flex items-center justify-center p-2 z-10">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <RecipeBook 
            recipes={recipes}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            onEdit={openEditModal}
            onDelete={handleDeleteRecipe}
          />
        )}
      </main>

      {/* Modal for Add/Edit */}
      <Modal 
        isOpen={isModalOpen} 
        title={editingRecipe ? "Edit Recipe" : "New Recipe"} 
        onClose={() => setIsModalOpen(false)}
      >
        <RecipeForm 
          onSubmit={handleSaveRecipe} 
          initialData={editingRecipe} 
          isSaving={isSaving} 
        />
      </Modal>

      {/* Footer Info */}
      <footer className="w-full py-4 text-center text-amber-900/40 text-xs font-mono">
        Cookbook ID: {userId || '...'}
      </footer>

      {/* CSS Utilities */}
      <style>{`
        .rotate-y-90 { transform: rotateY(-90deg); }
        .shadow-inner-paper { box-shadow: inset 20px 0 50px rgba(0,0,0,0.1), 5px 0 15px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(146, 64, 14, 0.2); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default App;

