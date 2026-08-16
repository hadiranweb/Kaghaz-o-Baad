import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ArticleCommentsProps {
  articleId: string;
}

export default function ArticleComments({ articleId }: ArticleCommentsProps) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Load commenter profiles
      const userIds = [...new Set(comments?.map(c => c.user_id).filter(Boolean))];
      let profiles: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profilesData) {
          profilesData.forEach(p => {
            profiles[p.user_id!] = p;
          });
        }
      }

      return { comments: comments || [], profiles };
    },
  });

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from('comments')
        .insert({ article_id: articleId, user_id: user!.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
      setNewComment('');
      toast({
        title: locale === 'fa' ? 'موفق' : 'Success',
        description: locale === 'fa' ? 'نظر شما ثبت شد' : 'Comment posted',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'خطا' : 'Error',
        description: locale === 'fa' ? 'خطا در ثبت نظر' : 'Error posting comment',
      });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
  };

  const comments = commentsData?.comments || [];
  const profiles = commentsData?.profiles || {};

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        {locale === 'fa' ? `نظرات (${comments.length})` : `Comments (${comments.length})`}
      </h3>

      {/* Comment List */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">
          {locale === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {locale === 'fa' ? 'هنوز نظری ثبت نشده' : 'No comments yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const profile = profiles[comment.user_id];
            return (
              <Card key={comment.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {profile
                            ? `${profile.first_name} ${profile.last_name}`
                            : (locale === 'fa' ? 'کاربر' : 'User')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString(locale)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                    </div>
                    {user && user.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => deleteComment.mutate(comment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={locale === 'fa' ? 'نظر خود را بنویسید...' : 'Write a comment...'}
            rows={2}
            className="flex-1"
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
          />
          <Button type="submit" size="icon" disabled={addComment.isPending || !newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {locale === 'fa' ? (
            <>برای ثبت نظر <Link to="/auth" className="text-primary underline">وارد شوید</Link></>
          ) : (
            <>Please <Link to="/auth" className="text-primary underline">sign in</Link> to comment</>
          )}
        </p>
      )}
    </div>
  );
}
