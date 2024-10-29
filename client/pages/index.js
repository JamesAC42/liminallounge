import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/styles/Home.module.scss";
import Navbar from "@/components/Navbar";
import ThemePicker from "@/components/ThemePicker";
export default function Home() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await fetch('/api/boards');
        if (!response.ok) {
          throw new Error('Failed to fetch boards');
        }
        const data = await response.json();
        setBoards(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Head>
        <title>liminal lounge | boards</title>
        <meta name="description" content="Join our discussion boards covering science, technology, literature and more" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />
      
      <div className={styles.main}>
        <div className={styles.header}>
          <h2>liminal lounge</h2>
          <p>interactive text-board simulator</p>
          <ThemePicker />
        </div>
        
        <div className={styles.boardsContainer}>
          {boards.map((board) => (
            <Link 
              href={`/board/${board.name.toLowerCase()}`}
              key={board.id}
              className={styles.boardCard}
            >
              <h2>{board.name}</h2>
              <p>{board.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
