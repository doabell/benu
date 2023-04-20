import React from "react";
import { DatePicker } from "@mui/x-date-pickers";
import { IconButton, Stack } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import dayjs from "dayjs";

interface DateSelectorProps {
  date: dayjs.Dayjs;
  onDateChange: (date: dayjs.Dayjs | null) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ date, onDateChange }) => {
  const lastDay = () => {
    onDateChange(date.subtract(1, "day"));
  };
  const nextDay = () => {
    onDateChange(date.add(1, "day"));
  };
  return (
    <Stack
      direction="row"
      spacing={0}
      justifyContent="center"
      alignItems="center"
    >
      <IconButton aria-label="last day" onClick={lastDay} size="small">
        <ArrowBackIosIcon />
      </IconButton>
      <DatePicker label="Date" value={dayjs(date)} onChange={onDateChange} />
      <IconButton aria-label="next day" onClick={nextDay} size="small">
        <ArrowForwardIosIcon />
      </IconButton>
    </Stack>
  );
};

export default DateSelector;
