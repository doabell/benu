import React from "react";
import { Tab, Tabs } from "@mui/material";

import halls from "@/data/halls.json";

interface PlaceSelectorProps {
  place: string;
  onPlaceChange: (place: string) => void;
}

const PlaceSelector: React.FC<PlaceSelectorProps> = ({ place, onPlaceChange }) => {
  const changePlace = (_event: React.SyntheticEvent, newPlace: string) => {
    onPlaceChange(newPlace);
  };

  const placeTabs = halls.map(({ id, name }) => (
    <Tab key={id} label={name} value={id} />
  ));

  return (
      <Tabs
        value={place}
        onChange={changePlace}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Select dining hall"
      >
        {placeTabs}
      </Tabs>
  );
};

export default PlaceSelector;
