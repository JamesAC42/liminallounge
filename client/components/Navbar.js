import styles from "@/styles/Navbar.module.scss";
import Link from "next/link";

export default function Navbar() {
    return (
        <div className={styles.navbar}>
            <div className={styles.left}>
                <Link href="/">home</Link>
                <div className={styles.divider} />
                <div className={styles.boardLinks}>
                    <Link href="/board/literature">lit</Link>
                    <Link href="/board/random">random</Link>
                    <Link href="/board/science">sci</Link>
                    <Link href="/board/technology">tech</Link>
                    <Link href="/board/food">food</Link>
                    <Link href="/board/music">music</Link>
                    <Link href="/board/tv">tv</Link>
                    <Link href="/board/video_games">vg</Link>
                    <Link href="/board/history">history</Link>
                    <Link href="/board/philosophy">philosophy</Link>
                </div>
            </div>

            <div className={styles.right}>
                <Link href="/about">about</Link>
            </div>
        </div>
    )
}