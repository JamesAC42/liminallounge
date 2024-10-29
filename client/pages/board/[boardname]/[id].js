import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '@/styles/Thread.module.scss'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import ThemePicker from '@/components/ThemePicker';

// Update the date formatting function
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

export default function Thread({ thread, posts }) {

  const router = useRouter()
  const [newPost, setNewPost] = useState({ content: '', author: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPostForm, setShowPostForm] = useState(false);

  const MAX_REPLIES = 500;
  const isThreadLocked = thread.postCount >= MAX_REPLIES;

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  const replyToPost = (id) => {
    if (!isThreadLocked && !showPostForm) {
      setShowPostForm(true);
    }
    if (!isThreadLocked) {
      setNewPost(prev => ({
        ...prev,
        content: prev.content ? `${prev.content}\n>>${id}\n` : `>>${id}\n\n`
      }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/threads/${router.query.boardname}/${router.query.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPost),
      })

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          setCooldown(data.remainingTime);
          const timer = setInterval(() => {
            setCooldown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (response.status === 400 && data.error.includes('spam')) {
          alert('Your message was detected as spam. Please remove any URLs, commercial content, or excessive formatting.');
        } else {
          alert(data.error);
        }
        return;
      }

      // Reset form and refresh page
      setNewPost({ content: '', author: '' })
      router.replace(router.asPath)
    } catch (error) {
      console.error('Error creating post:', error)
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefresh = () => {
    router.replace(router.asPath)
  }

  return (
    <>
      <Head>
        <title>{thread.title} | {thread.board} board</title>
        <meta name="description" content={thread.preview} />
      </Head>

      <Navbar />

      <div className={styles.main}>
        <div className={styles.threadHeader}>
            <h1>{thread.title}</h1>
            <div className={styles.threadMeta}>
                <span>{thread.postCount} {thread.postCount === 1 ? 'post' : 'posts'}</span>
                <span>Created: {formatDate(thread.createdAt)}</span>
                <span className={styles.replyLimit}>
                {MAX_REPLIES - thread.postCount} {MAX_REPLIES - thread.postCount === 1 ? 'reply' : 'replies'} remaining
                </span>
            </div>
            <div className={styles.threadHeaderButtons}>
                <button onClick={handleRefresh} className={styles.refreshButton}>
                    Refresh
                </button>
                {
                    !isThreadLocked && (
                        <button onClick={() => setShowPostForm(!showPostForm)} className={styles.postFormButton}>
                            {showPostForm ? 'Hide Reply' : 'Reply'}
                        </button>
                    )
                }
            </div>
        </div>

        {isThreadLocked ? (
            <div className={styles.threadLocked}>
                This thread has reached the maximum number of replies (500) and is now locked.
            </div>
            ) : showPostForm ? (
            <form onSubmit={handleSubmit} className={styles.postForm}>
                <h2>Add a Reply</h2>
                <div>
                <input
                    type="text"
                    placeholder="Your Name (optional)"
                    value={newPost.author}
                    maxLength={100}
                    onChange={(e) => setNewPost(prev => ({ ...prev, author: e.target.value }))}
                    disabled={isSubmitting}
                />
                </div>
                <div>
                <textarea
                    placeholder="Your Reply"
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    required
                    maxLength={2000}
                    disabled={isSubmitting}
                />
                </div>
                {cooldown > 0 && (
                <div className={styles.cooldown}>
                    Please wait {cooldown} seconds before posting again
                </div>
                )}
                <button type="submit" disabled={isSubmitting || cooldown > 0}>
                {isSubmitting ? 'Posting...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Post Reply'}
                </button>
            </form>
        ) : null}
        
        <div className={styles.postList}>
          {posts.map((post) => (
            <div key={post.id} className={styles.post}>
              <div className={styles.postHeader}>
                <span className={styles.author}>{post.author}</span>
                <span className={styles.date}>
                  {formatDate(post.createdAt)}
                </span>
                <span 
                  className={styles.postId}
                  onClick={() => replyToPost(post.id)}
                  style={{cursor: isThreadLocked ? 'default' : 'pointer'}}>
                  No.{post.id}
                </span>
              </div>
              <div className={styles.postContent}>
                {post.content}
              </div>
            </div>
          ))}
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
    const [threadResponse, postsResponse] = await Promise.all([
      fetch(`${process.env.API_URL}/api/threads/${params.boardname}/${params.id}`),
      fetch(`${process.env.API_URL}/api/threads/${params.boardname}/${params.id}/posts`)
    ]);

    if (!threadResponse.ok || !postsResponse.ok) {
      throw new Error('Failed to fetch data');
    }

    const thread = await threadResponse.json();
    const posts = await postsResponse.json();

    console.log(posts);

    return {
      props: {
        thread,
        posts
      }
    };
  } catch (error) {
    console.error('Error fetching thread data:', error);
    return {
      notFound: true
    };
  }
}
