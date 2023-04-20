import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import DateSelector from "../components/DateSelector";
import MealSelector from "../components/MealSelector";
import PlaceSelector from "../components/PlaceSelector";
import MenuItems from "../components/MenuItems";
import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2
import { LinearProgress, Container, Box } from "@mui/material";

import MenuItem from "@/models/MenuItem";
import halls from "@/data/halls.json";

const HomePage: React.FC = () => {
  const [date, setDate] = useState(dayjs());
  const [place, setPlace] = useState(halls[0].id);
  const [meals, setMeals] = useState(halls[0].options);
  const [meal, setMeal] = useState(meals[0].id);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const handleDateChange = (newDate: dayjs.Dayjs | null) => {
    if (newDate) {
      setDate(newDate);
    } else {
      setDate(dayjs());
    }
  };

  useEffect(() => {
    const hall = halls.find((_hall) => _hall.id === place);
    if (hall) {
      const { options } = hall;
      if (options.filter((option) => option.id === meal).length === 0) {
        setMeal(options[0].id);
      }
      setMeals(options);

    } else {
      throw new Error("No dining hall!");
    }
  }, [place, meal]);

  const fetchMenuItems = async (dateObject: dayjs.Dayjs, placeStr: string, mealStr: string) => {
    try {
      const url = `/api/menu?dateStr=${dateObject.format("YYYY-MM-DD")}&place=${placeStr}&meal=${mealStr}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      // Handle errors
    }
  };
  
  useEffect(() => {
    fetchMenuItems(date, place, meal);
  }, [date, place, meal]);
  

  return (
    <>
    <Grid container spacing={2}>
      <Grid xs={12} lg={6} display="flex" justifyContent="center" alignItems="center">
        <PlaceSelector place={place} onPlaceChange={setPlace} />
      </Grid>
      <Grid xs={12} sm={6} lg={2} display="flex" justifyContent="center" alignItems="center">
        <DateSelector date={date} onDateChange={handleDateChange} />
      </Grid>
      
      <Grid xs={12} sm={6} lg={4} display="flex" justifyContent="center" alignItems="center">
        <MealSelector meal={meal} meals={meals} setMeal={setMeal} />
      </Grid>
    </Grid>
    <Container maxWidth="lg">
    {
    menuItems.length > 0 ? <MenuItems items={menuItems} /> : <>
    <Box mt={5}>
    <LinearProgress />
    </Box>
    </>
    }
    </Container>
    </>
    
  );
};

export default HomePage;
