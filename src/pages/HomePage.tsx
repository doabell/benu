import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import DateSelector from "../components/DateSelector";
import MealSelector from "../components/MealSelector";
import PlaceSelector from "../components/PlaceSelector";
import MenuSections from "../components/MenuSections";
import noConnection from "@/data/noConnection.json";

import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2
import {
  LinearProgress,
  Container,
  Box,
  Stack,
  Fab,
  useTheme,
  Link
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TodayIcon from "@mui/icons-material/Today";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import MenuSection from "@/models/MenuSection";
import ColorMode from "@/models/ColorMode";
import halls from "@/data/halls.json";

import { useLocalStorageValue } from "@react-hookz/web";
import { trackPromise, usePromiseTracker } from "react-promise-tracker";

const HomePage: React.FC<{ colorMode: ColorMode }> = ({ colorMode }) => {
  const { promiseInProgress } = usePromiseTracker();

  const apiBase = process.env.API_BASE || "/api/handler";

  const [date, setDate] = useState<dayjs.Dayjs>();
  const dateStore = useLocalStorageValue("date", {
    defaultValue: dayjs(),
  });

  useEffect(() => {
    const storedDay = dayjs(dateStore.value);
    if (date) {
      dateStore.set(date);
    } else {
      setDate(storedDay);
    }
  }, [dateStore, date]);

  const place = useLocalStorageValue("place", {
    defaultValue: halls[0].id,
    initializeWithValue: false,
  });
  const [meals, setMeals] = useState(halls[0].options);
  const meal = useLocalStorageValue("meal", {
    defaultValue: meals[0].id,
    initializeWithValue: false,
  });
  const [MenuSectionsState, setMenuSectionsState] = useState<MenuSection[]>([]);

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

  const fetchMenuSections = async (
    dateObject: dayjs.Dayjs,
    placeStr: string,
    mealStr: string
  ) => {
    try {
      const url = `${apiBase}?dateStr=${dateObject.format(
        "YYYY-MM-DD"
      )}&place=${placeStr}&meal=${mealStr}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json();
      setMenuSectionsState(data);
    } catch (error) {
      setMenuSectionsState(noConnection);
    }
  };

  useEffect(() => {
    const hall = halls.find((_hall) => _hall.id === place.value);
    if (hall && date && place.value && meal.value) {
      const { options } = hall;
      if (options.filter((option) => option.id === meal.value).length !== 0) {
        trackPromise(fetchMenuSections(date, place.value, meal.value));
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
          <DateSelector date={date!} onDateChange={handleDateChange} />
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
        {!promiseInProgress && MenuSections.length > 0 ? (
          <>
          <MenuSections sections={MenuSectionsState} />
          <Link href={`https://middlebury.nutrislice.com/menu/${place.value}/${meal.value}/${date?.format("YYYY-MM-DD")}`} variant="h6" color="inherit" rel="noreferrer">
          View original menu
          </Link>
          </>
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
          <Fab
            variant="extended"
            color="primary"
            aria-label="back to today"
            onClick={() => handleDateChange(dayjs())}
          >
            <TodayIcon sx={{ mr: 1 }} />
            Today
          </Fab>
        )}
        {useTheme().palette.mode === "dark" ? (
          <Fab
            variant="extended"
            color="primary"
            aria-label="toggle dark mode"
            onClick={colorMode.toggleColorMode}
          >
            <LightModeIcon sx={{ mr: 1 }} />
            Light
          </Fab>
        ) : (
          <Fab
            variant="extended"
            color="primary"
            aria-label="toggle dark mode"
            onClick={colorMode.toggleColorMode}
          >
            <DarkModeIcon sx={{ mr: 1 }} />
            Dark
          </Fab>
        )}
      </Stack>
    </LocalizationProvider>
  );
};

export default HomePage;
