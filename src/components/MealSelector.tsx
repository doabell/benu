import React from "react";
import { Tab, Tabs } from "@mui/material";

interface MealSelectorProps {
  meal: string;
  meals: { id: string; name:string; }[];
  setMeal: (meal: string) => void;
}

const MealSelector: React.FC<MealSelectorProps> = ({ meal, meals, setMeal }) => {
  const changeMeal = (_event: React.SyntheticEvent, newMeal: string) => {
    setMeal(newMeal);
  };

  const mealTabs = meals.map(({ id, name }) => (
    <Tab key={id} label={name} value={id} />
  ));
  
  if (mealTabs.length === 1) {
    // setMeal(meals[0].id);
    return <></>;
  } else {
    return (
      <Tabs
        value={meal}
        onChange={changeMeal}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Select dining hall"
      >
        {mealTabs}
      </Tabs>
    );
  }

  
};

export default MealSelector;
