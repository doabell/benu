import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import halls from '@/data/halls.json';

interface PlaceSelectorProps {
  place: string;
  onPlaceChange: (place: string) => void;
}

const PlaceSelector: React.FC<PlaceSelectorProps> = ({ place, onPlaceChange }) => {
  const changePlace = (_event: React.MouseEvent, place: string) => {
    onPlaceChange(place);
  }

  const placeButtons = halls.map(({ id, name }) => (
    <ToggleButton
      key={id}
      value={id}
      selected={place === id}
    >
      {name}
    </ToggleButton>
  ));

  return (
    <ToggleButtonGroup
      color="primary"
      exclusive
      onChange={changePlace}
    >
        {placeButtons}
    </ToggleButtonGroup>
    );
};

export default PlaceSelector;
