import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function Index() {
  const { token } = useSelector((state: RootState) => state.auth);

  if (!token) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/home" />;
}
