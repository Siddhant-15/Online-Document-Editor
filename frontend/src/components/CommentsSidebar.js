import React from "react"
import styles from "../styles/CommentsSidebar.module.css"

export default function CommentsSidebar({ comments, quill, onCommentClick }) {
  if (!comments || comments.length === 0) return null

  const getTopOffset = (comment) => {
    if (!quill) return 0
    try {
      const bounds = quill.getBounds(comment.position.index, comment.position.length)
      return bounds.top
    } catch (e) {
      return 0
    }
  }

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.header}>Comments</h3>
      <div className={styles.commentsList}>
        {comments.map((comment, index) => {
          // simple overlap prevention naive baseline
          const topOffset = getTopOffset(comment)
          
          return (
            <div
              key={comment._id || index}
              className={styles.commentCard}
              style={{ top: Math.max(index * 100, topOffset) + "px", cursor: "pointer" }}
              onClick={() => onCommentClick && onCommentClick(comment)}
            >
              <div className={styles.commentAuthor}>
                {comment.userId?.name || "Anonymous"}
              </div>
              <div className={styles.commentText}>{comment.text}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
