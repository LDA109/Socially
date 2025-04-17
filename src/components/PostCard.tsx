"use client";
import { createComment, deletePost, getPosts, toggleLike } from "@/Action/post.action";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { Avatar, AvatarImage } from "./ui/avatar";
import {formatDistanceToNow} from "date-fns";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import { Button } from "./ui/button";
import { CornerDownRightIcon, HeartIcon, LogInIcon, MessageCircleIcon, ReplyIcon, SendIcon, XIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";

type Posts = Awaited<ReturnType<typeof getPosts>>
type Post = Posts[number]

function PostCard({post, dbUserId}: {post:Post; dbUserId:string | null}) {
    const { user } = useUser();
    const [newComment, setNewComment] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasLiked,setHasLiked] = useState(post.like.some(like => like.userId === dbUserId));
    const [optimisticLikes,setOptimisticLikes] = useState(post._count.like)
    const [showComments, setShowComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{commentId: string, authorName: string} | null>(null);

    const handleLike = async () => {
        if(isLiking) return
        setIsLiking(true)
        try {
            setIsLiking(true)
            setHasLiked(prev => !prev)
            setOptimisticLikes(prev => prev + (hasLiked ? - 1 : 1))
            await toggleLike(post.id)

        } catch (error) {
            setOptimisticLikes(post._count.like)
            setHasLiked(post.like.some(like => like.userId === dbUserId))
        } finally {
            setIsLiking(false)
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || isCommenting) return;
        try {
            setIsCommenting(true);
            let result;

            if (replyingTo) {
                // This is a reply to a comment
                result = await createComment(post.id, newComment, replyingTo.commentId);
                if (result?.success) {
                    toast.success(`Reply to ${replyingTo.authorName} posted successfully`);
                    setNewComment("");
                    setReplyingTo(null); // Clear reply state
                }
            } else {
                // This is a regular comment on the post
                result = await createComment(post.id, newComment);
                if (result?.success) {
                    toast.success("Comment posted successfully");
                    setNewComment("");
                }
            }
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setIsCommenting(false);
        }
    };

    const handleReply = (commentId: string, authorName: string) => {
        setReplyingTo({ commentId, authorName });
        // Focus on the comment input
        setTimeout(() => {
            const textarea = document.querySelector('textarea[placeholder="Write a comment..."]') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
            }
        }, 0);
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const handleDeletePost = async () => {
        if (isDeleting) return;
    try {
      setIsDeleting(true);
      const result = await deletePost(post.id);
      if (result.success) toast.success("Post deleted successfully");
      else throw new Error(result.error);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
    };

  return <Card className="overflow-hidden">
    <CardContent className="p-4 sm:p-6">
        <div className="spcace-y-4">
            <div className=" flex space-x-3 sm:space-x-4">
            <Link href={`/profile/${post.author.username}`}>
              <Avatar className="size-8 sm:w-10 sm:h-10">
                <AvatarImage src={post.author.image ?? "/avatar.png"} />
              </Avatar>
            </Link>
             {/* POST HEADER & TEXT CONTENT */}
             <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate">
                  <Link
                    href={`/profile/${post.author.username}`}
                    className="font-semibold truncate"
                  >
                    {post.author.name}
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Link href={`/profile/${post.author.username}`}>@{post.author.username}</Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>
                {/* Check if current user is the post author */}
                {dbUserId === post.author.id && (
                  <DeleteAlertDialog isDeleting={isDeleting} onDelete={handleDeletePost} />
                )}
              </div>
              <p className="mt-2 text-sm text-foreground break-words">{post.content}</p>
                </div>
            </div>
            {/* POST IMAGE */}
            {post.image && (
            <div className="rounded-lg overflow-hidden">
              <img src={post.image} alt="Post content" className="w-full h-auto object-cover" />
            </div>
          )}

          {/* LIKE & COMMENTS BUTTON */}
          <div className="flex items-center pt-2 space-x-4">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground gap-2 ${
                  hasLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
                }`}
                onClick={handleLike}
              >
                {hasLiked ? (
                  <HeartIcon className="size-5 fill-current" />
                ) : (
                  <HeartIcon className="size-5" />
                )}
                <span>{optimisticLikes}</span>
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <HeartIcon className="size-5" />
                  <span>{optimisticLikes}</span>
                </Button>
              </SignInButton>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2 hover:text-blue-500"
              onClick={() => setShowComments((prev) => !prev)}
            >
              <MessageCircleIcon
                className={`size-5 ${showComments ? "fill-blue-500 text-blue-500" : ""}`}
              />
              <span>{post.comments.length}</span>
            </Button>
          </div>

          {/* COMMENTS SECTION */}
          {showComments && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                {/* DISPLAY COMMENTS */}
                {post.comments.map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    {/* Main comment */}
                    <div className="flex space-x-3">
                      <Avatar className="size-8 flex-shrink-0">
                        <AvatarImage src={comment.author.image ?? "/avatar.png"} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <span className="text-sm text-muted-foreground">
                            @{comment.author.username}
                          </span>
                          <span className="text-sm text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                          </span>
                        </div>
                        <p className="text-sm break-words">{comment.content}</p>

                        {/* Reply button */}
                        {user && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-6 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleReply(comment.id, comment.author.name || comment.author.username)}
                          >
                            <ReplyIcon className="size-3 mr-1" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Replies to this comment */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 pl-4 border-l space-y-3">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex space-x-3">
                            <Avatar className="size-7 flex-shrink-0">
                              <AvatarImage src={reply.author.image ?? "/avatar.png"} />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-medium text-sm">{reply.author.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  @{reply.author.username}
                                </span>
                                <span className="text-sm text-muted-foreground">·</span>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.createdAt))} ago
                                </span>
                              </div>
                              <p className="text-sm break-words">{reply.content}</p>

                              {/* Reply to reply button */}
                              {user && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-6 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleReply(comment.id, reply.author.name || reply.author.username)}
                                >
                                  <ReplyIcon className="size-3 mr-1" />
                                  Reply
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex space-x-3">
                  <Avatar className="size-8 flex-shrink-0">
                    <AvatarImage src={user?.imageUrl || "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1">
                    {/* Reply indicator */}
                    {replyingTo && (
                      <div className="flex items-center mb-2 p-2 bg-muted rounded-md">
                        <span className="text-sm flex-1">
                          <span className="text-muted-foreground">Replying to </span>
                          <span className="font-medium">{replyingTo.authorName}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={cancelReply}
                        >
                          <XIcon className="size-3" />
                        </Button>
                      </div>
                    )}

                    <Textarea
                      placeholder={replyingTo ? `Write a reply to ${replyingTo.authorName}...` : "Write a comment..."}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        className="flex items-center gap-2"
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? (
                          "Posting..."
                        ) : (
                          <>
                            <SendIcon className="size-4" />
                            {replyingTo ? "Reply" : "Comment"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-4 border rounded-lg bg-muted/50">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" />
                      Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}
        </div>
</CardContent>

  </Card>;

}

export default PostCard