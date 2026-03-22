import React, { useState, useEffect } from "react"
import styles from "../styles/CommentsSidebar.module.css"

export default function CommentsSidebar({ comments, quill, onCommentClick }) {
  const [positions, setPositions] = useState([])

  useEffect(() => {
    if (!comments || comments.length === 0 || !quill) {
      setPositions([])
      return
    }

    const getTopOffset = (comment) => {
      if (!comment.position) return 0
      try {
        const bounds = quill.getBounds(comment.position.index, Math.max(1, comment.position.length || 1))
        return bounds.top
      } catch (e) {
        return 0
      }
    }

    const calculatePositions = () => {
      const minHeight = 100 // approximate card height + gap
      const posArray = comments.map((comment, index) => ({
        index,
        originalTop: getTopOffset(comment),
        top: getTopOffset(comment),
      }))

      // Sort by vertical position
      posArray.sort((a, b) => a.originalTop - b.originalTop)

      // Resolve overlaps
      for (let i = 1; i < posArray.length; i++) {
        const prev = posArray[i - 1]
        const curr = posArray[i]
        if (curr.top < prev.top + minHeight) {
          curr.top = prev.top + minHeight
        }
      }

      const finalPos = new Array(comments.length)
      posArray.forEach((p) => {
        finalPos[p.index] = p.top
      })

      setPositions(finalPos)
    }

    // Small delay to ensure Quill rendering is complete before calculating bounds
    setTimeout(calculatePositions, 100)
    
  }, [comments, quill])

  if (!comments || comments.length === 0) return null

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.header}>Comments</h3>
      <div className={styles.commentsList}>
        {comments.map((comment, index) => {
          const topOffset = positions[index] || 0
          
          const userName = comment.userId?.name || "Anonymous"
          const userAvatar = comment.userId?.avatar
          const initials = userName.split(" ").map(p => p[0]?.toUpperCase() || "").join("")

          return (
            <div
              key={comment._id || index}
              className={styles.commentCard}
              style={{ top: topOffset + "px", cursor: "pointer" }}
              onClick={() => onCommentClick && onCommentClick(comment)}
            >
              <div className={styles.commentHeader}>
                <div className={styles.avatar}>
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} />
                  ) : (
                    initials
                  )}
                </div>
                <div className={styles.commentAuthor}>{userName}</div>
              </div>
              <div className={styles.commentText}>{comment.text}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
