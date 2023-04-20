import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

interface MealSelectorProps {
  meal: string;
  meals: {id: string; name:string;}[];
  setMeal: (meal: string) => void;
}

const MealSelector: React.FC<MealSelectorProps> = ({ meal, meals, setMeal }) => {
  const changeMeal = (_event: React.MouseEvent, meal: string) => {
    setMeal(meal);
  }

  const mealButtons = meals.map(({ id, name }) => (
    <ToggleButton
      key={id}
      value={id}
      selected={meal === id}
    >
      {name}
    </ToggleButton>
  ));

  return (
    <ToggleButtonGroup
      color="primary"
      exclusive
      onChange={changeMeal}
    >
        {mealButtons}
    </ToggleButtonGroup>
    );
};

export default MealSelector;
