import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import DateSelector from "../components/DateSelector";
import MealSelector from "../components/MealSelector";
import PlaceSelector from "../components/PlaceSelector";
import MenuItems from "../components/MenuItems";

import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2
import {
  LinearProgress,
  Container,
  Box,
  Stack,
  Fab,
  useTheme,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TodayIcon from "@mui/icons-material/Today";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import MenuItem from "@/models/MenuItem";
import halls from "@/data/halls.json";

import { useLocalStorageValue } from "@react-hookz/web";

const HomePage: React.FC<{ setMode: React.Dispatch<React.SetStateAction<"light" | "dark">> }> = ({ setMode }) => {
  const [date, setDate] = useState(dayjs());

  const place = useLocalStorageValue("place", {
    defaultValue: halls[0].id,
    initializeWithValue: false,
  });
  const [meals, setMeals] = useState(halls[0].options);
  const meal = useLocalStorageValue("meal", {
    defaultValue: meals[0].id,
    initializeWithValue: false,
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const handleDateChange = (newDate: dayjs.Dayjs | null) => {
    if (newDate) {
      setDate(newDate);
    } else {
      setDate(dayjs());
    }
  };

  useEffect(() => {
    const hall = halls.find((_hall) => _hall.id === place.value);
    if (hall) {
      setMeals(hall.options);
    }
  }, [place]);

  const fetchMenuItems = async (
    dateObject: dayjs.Dayjs,
    placeStr: string,
    mealStr: string
  ) => {
    try {
      const url = `/api/menu?dateStr=${dateObject.format(
        "YYYY-MM-DD"
      )}&place=${placeStr}&meal=${mealStr}`;
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
    const hall = halls.find((_hall) => _hall.id === place.value);
    if (hall && date && place.value && meal.value) {
      const { options } = hall;
      if (options.filter((option) => option.id === meal.value).length !== 0) {
        fetchMenuItems(date, place.value, meal.value);
      } else {
        meal.set(options[0].id);
      }
    }
  }, [date, place, meal]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={2}>
        <Grid
          xs={12}
          lg={6}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <PlaceSelector place={place.value} onPlaceChange={place.set} />
        </Grid>
        <Grid
          xs={12}
          sm={6}
          lg={2}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <DateSelector date={date} onDateChange={handleDateChange} />
        </Grid>

        <Grid
          xs={12}
          sm={6}
          lg={4}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <MealSelector meal={meal.value} meals={meals} setMeal={meal.set} />
        </Grid>
      </Grid>
      <Container maxWidth="lg">
        {menuItems.length > 0 ? (
          <MenuItems items={menuItems} />
        ) : (
          <>
            <Box mt={5}>
              <LinearProgress />
            </Box>
          </>
        )}
      </Container>
      <Stack
        spacing={2}
        sx={{
          position: "fixed",
          bottom: useTheme().spacing(4),
          right: useTheme().spacing(4),
        }}
      >
        {!dayjs().isSame(date, "day") && (
          <Fab variant="extended" color="primary" aria-label="back to today">
            <TodayIcon
              sx={{ mr: 1 }}
              onClick={() => handleDateChange(dayjs())}
            />
            Today
          </Fab>
        )}
        <Fab variant="extended" color="primary" aria-label="toggle dark mode">
          {useTheme().palette.mode === "dark" ? (
            <>
              <LightModeIcon
                sx={{ mr: 1 }}
                onClick={() => setMode("light")}
              />
              Light
            </>
          ) : (
            <>
              <DarkModeIcon
                sx={{ mr: 1 }}
                onClick={() => setMode("dark")}
              />
              Dark
            </>
          )}
        </Fab>
      </Stack>
    </LocalizationProvider>
  );
};

export default HomePage;
