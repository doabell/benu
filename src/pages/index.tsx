import HomePage from '../pages/HomePage';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

const IndexPage: React.FC = () => {
  return (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <HomePage />
  </LocalizationProvider>
  );
};

export default IndexPage;
