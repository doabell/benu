import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import DateSelector from '../components/DateSelector';
import MealSelector from '../components/MealSelector';
import PlaceSelector from '../components/PlaceSelector';
import MenuItems from '../components/MenuItems';
import { LinearProgress, Stack } from '@mui/material';

import MenuItem from '@/models/MenuItem';
import halls from '@/data/halls.json';

const HomePage: React.FC = () => {
  const [date, setDate] = useState(dayjs());
  const [place, setPlace] = useState(halls[0].id);
  const [meals, setMeals] = useState(halls[0].options);
  const [meal, setMeal] = useState(meals[0].id);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setDate(date);
    } else {
      setDate(dayjs());
    }
  };

  useEffect(() => {
    const hall = halls.find((hall) => hall.id === place);
    if (hall) {
      const options = hall.options;
      if (options.filter((option) => option.id === meal).length === 0) {
        setMeal(options[0].id);
      }
      setMeals(options);

    } else {
      throw new Error("No dining hall!");
    }
  }, [place, meal]);

  const onPlaceChange = (place: string) => {
    setPlace(place);

  };

  const fetchMenuItems = async (date: dayjs.Dayjs, place: string, meal: string) => {
    try {
      const url = `/api/menu?dateStr=${date.format('YYYY-MM-DD')}&place=${place}&meal=${meal}`
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
    <Stack
    direction={{ xs: 'column', lg: 'row' }}
      spacing={2}
      justifyContent="flex-start"
      alignItems="center"
    >
        <DateSelector date={date} onDateChange={handleDateChange} />
        <PlaceSelector place={place} onPlaceChange={onPlaceChange} />
        <MealSelector meal={meal} meals={meals} setMeal={setMeal} />
    </Stack>
    {menuItems.length > 0 ? <MenuItems items={menuItems} /> : <LinearProgress />}
    </>
    
  );
};

export default HomePage;
