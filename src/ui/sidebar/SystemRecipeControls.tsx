import { useState } from 'react'
import { Library, Save } from 'lucide-react'
import { useDesign } from '../../store/useDesign'
import { Button } from '../../components/ui/button'

export function SystemRecipeControls() {
  const [name, setName] = useState('')
  const recipes = useDesign(s => s.systemRecipes)
  const saveCurrentRecipe = useDesign(s => s.saveCurrentRecipe)
  const applyRecipe = useDesign(s => s.applyRecipe)

  const save = () => {
    const recipe = saveCurrentRecipe(name)
    setName(recipe.name)
  }

  return (
    <div className="sb-section space-y-2">
      <label className="block space-y-1">
        <span className="font-sans text-[10px] font-medium text-muted-foreground">Recipe name</span>
        <input
          aria-label="Recipe name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Swiss Sprint"
          className="h-8 w-full rounded-md border-2 border-foreground bg-background px-2 font-sans text-xs text-foreground focus:outline-none focus:border-accent"
        />
      </label>
      <Button size="sm" className="w-full" onClick={save} aria-label="Save system">
        <Save size={13} strokeWidth={2.25} />
        Save system
      </Button>
      {recipes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {recipes.map(recipe => (
            <Button
              key={recipe.id}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => applyRecipe(recipe.id)}
              aria-label={`Apply ${recipe.name}`}
            >
              <Library size={13} strokeWidth={2.25} />
              <span className="truncate">{recipe.name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
