import styles from '../styles/ThemePicker.module.scss';
import ThemeContext from '../contexts/ThemeContext';
import { useContext } from 'react';
import { themes } from '../utilities/themes';

export default function ThemePicker() {
    const { theme, setTheme } = useContext(ThemeContext);

    const updateTheme = (e) => {
        setTheme(e.target.value);
        localStorage.setItem('liminallounge:theme', e.target.value);
    }

    return(
        <div className={styles.themePicker}>
            <select value={theme} onChange={updateTheme}>
                {Object.values(themes).map((theme) => (
                    <option key={theme} value={theme}>
                        {theme}
                    </option>
                ))}
            </select>
        </div>
    )
}