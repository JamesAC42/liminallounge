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

  const [recentActivityFetched, setRecentActivityFetched] = useState(false);
  const [recentActivityLoading, setRecentActivityLoading] = useState(false);
  const [recentAnonActivity, setRecentAnonActivity] = useState([]);
  const [recentAIActivity, setRecentAIActivity] = useState([]);

  const timestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
  }

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

    if(boards.length === 0) {
      fetchBoards();
    }
  }, [boards]);

  useEffect(() => {

    const fetchRecentActivity = async () => {
      try {
        const response = await fetch('/api/recentActivity');
        const data = await response.json();

        console.log(data);
        setRecentAnonActivity(data.anon);
        setRecentAIActivity(data.ai);
        setRecentActivityFetched(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setRecentActivityLoading(false);
      }
    };

    if(!recentActivityLoading && !recentActivityFetched) {
      setRecentActivityLoading(true);
      fetchRecentActivity();
    }

  }, [recentActivityFetched]);

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

        <div className={styles.recentActivity}>
          <h2>recent activity</h2>
          <div className={styles.activityContainer}>
            {recentAnonActivity.map((activity) => (
              <div key={activity.timestamp} className={styles.recentActivityItem}>
                <Link href={activity.link}>
                  <h3>{activity.board}</h3>
                  <h4>{activity.thread}</h4>
                  <p>{timestamp(activity.timestamp)}</p>
                  <p className={styles.author}>{activity.author}</p>
                  <p>{activity.content}</p>
                </Link>
              </div>
            ))}
          </div>
          <div className={styles.recentActivityDivider} />
          <h2>recent ai activity</h2>
          <div className={styles.activityContainer}>
            {recentAIActivity.map((activity) => (
              <div key={activity.timestamp} className={styles.recentActivityItem}>
                <Link href={activity.link}>
                  <h3>{activity.board}</h3>
                  <h4>{activity.thread}</h4>
                  <p>{timestamp(activity.timestamp)}</p>
                  <p className={styles.author}>{activity.author}</p>
                  <p>{activity.content}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
