import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import styles from '@/styles/Board.module.scss'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ThemePicker from '@/components/ThemePicker';

export default function Board({ threads, boardName }) {
  const router = useRouter()
  const [newThread, setNewThread] = useState({ title: '', content: '', author: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const [showThreadForm, setShowThreadForm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/boards/${router.query.boardname}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newThread),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 429) {
          setCooldown(data.remainingTime)
          const timer = setInterval(() => {
            setCooldown(prev => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        } else if (response.status === 400 && data.error.includes('spam')) {
          alert('Your message was detected as spam. Please remove any URLs, commercial content, or excessive formatting.')
        } else {
          alert(data.error)
        }
        return
      }

      // Reset form
      setNewThread({ title: '', content: '', author: '' })
      setShowThreadForm(false)
      
      // Force a fresh server-side render
      router.replace(router.asPath, undefined, { scroll: false })
    } catch (error) {
      console.error('Error creating thread:', error)
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefresh = () => {
    router.replace(router.asPath)
  }
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',','');
  }

  return (
    <>
      <Head>
        <title>liminal lounge | {boardName.toLowerCase()}</title>
        <meta name="description" content={`Discussions and threads about ${boardName}`} />
      </Head>

      <Navbar />

      <div className={styles.main}>
        <div className={styles.boardHeader}>
          <h1>{boardName.toLowerCase()}</h1>

          <div className={styles.boardHeaderButtons}>
            <button onClick={handleRefresh} className={styles.refreshButton}>
              Refresh
            </button>
            <button onClick={() => setShowThreadForm(!showThreadForm)} className={styles.refreshButton}>
              {showThreadForm ? 'Close' : 'New Thread'}
            </button>
          </div>
        </div>
        
        {showThreadForm && (
        <form onSubmit={handleSubmit} className={styles.threadForm}>
          <h2>Create New Thread</h2>
          <div>
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={newThread.author}
              onChange={(e) => setNewThread(prev => ({ ...prev, author: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Thread Title"
              value={newThread.title}
              maxLength={100}
              onChange={(e) => setNewThread(prev => ({ ...prev, title: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <textarea
              placeholder="Thread Content"
              value={newThread.content}
              onChange={(e) => setNewThread(prev => ({ ...prev, content: e.target.value }))}
              required
              maxLength={2000}
              disabled={isSubmitting}
            />
          </div>
          {cooldown > 0 && (
            <div className={styles.cooldown}>
              Please wait {cooldown} seconds before creating another thread
            </div>
          )}
          <button type="submit" disabled={isSubmitting || cooldown > 0}>
            {isSubmitting ? 'Creating...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Create Thread'}
            </button>
          </form>
        )}

        <div className={styles.threadList}>
          {threads?.map((thread) => (
            <Link 
              href={`/board/${router.query.boardname}/${thread.id}`}
              key={thread.id}
              className={styles.threadCard}
            >
              <h2>{thread.title}</h2>
              <p>{thread.preview}</p>
              <div className={styles.threadMeta}>
                <span>{thread.postCount} posts</span>
                <span>Last activity: {formatDate(thread.lastActivity)}</span>
              </div>
            </Link>
          ))}

          {threads.length === 0 && (
            <div className={styles.noThreads}>
              No threads found
            </div>
          )}
        </div>
          
        <div className={styles.themePickerOuter}>
          <ThemePicker />
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  try {
    const response = await fetch(`${process.env.API_URL}/api/boards/${params.boardname}/threads`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const threads = await response.json();

    return {
      props: {
        threads,
        boardName: params.boardname.charAt(0).toUpperCase() + params.boardname.slice(1)
      }
    }
  } catch (error) {
    console.error('Error fetching board data:', error);
    return {
      notFound: true
    }
  }
}
