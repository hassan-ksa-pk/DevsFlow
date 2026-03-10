import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, Upload, Globe, Search, Trash2, FileText, Link2,
  Loader2, AlertCircle, CheckCircle2, Plus, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  content_text: string | null;
  created_at: string;
}

interface KnowledgeWebPage {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  content_text: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

interface KnowledgeBaseProps {
  projectId: string;
  userId: string;
  webSearchEnabled: boolean;
  onToggleWebSearch: (enabled: boolean) => void;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_WEB_PAGES = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function KnowledgeBase({ projectId, userId, webSearchEnabled, onToggleWebSearch }: KnowledgeBaseProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [webPages, setWebPages] = useState<KnowledgeWebPage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingPageId, setFetchingPageId] = useState<string | null>(null);

  const totalFileSize = files.reduce((sum, f) => sum + f.file_size, 0);
  const usagePercent = Math.min((totalFileSize / MAX_FILE_SIZE) * 100, 100);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [filesRes, pagesRes] = await Promise.all([
      supabase.from('knowledge_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('knowledge_web_pages').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    setFiles((filesRes.data as KnowledgeFile[]) || []);
    setWebPages((pagesRes.data as KnowledgeWebPage[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (totalFileSize + file.size > MAX_FILE_SIZE) {
      toast({ title: 'Size limit exceeded', description: `Adding this file would exceed the 3MB limit. Current usage: ${formatBytes(totalFileSize)}`, variant: 'destructive' });
      return;
    }

    const allowedTypes = ['.txt', '.md', '.csv', '.json', '.pdf', '.html', '.xml'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast({ title: 'Unsupported file type', description: `Allowed: ${allowedTypes.join(', ')}`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${userId}/${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('knowledge-files').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Read text content for text-based files
      let contentText: string | null = null;
      if (['.txt', '.md', '.csv', '.json', '.html', '.xml'].includes(ext)) {
        contentText = await file.text();
        // Truncate to 50k chars to stay reasonable
        if (contentText.length > 50000) contentText = contentText.slice(0, 50000);
      }

      const { data: urlData } = supabase.storage.from('knowledge-files').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('knowledge_files').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        content_text: contentText,
      });
      if (insertError) throw insertError;

      toast({ title: 'File uploaded!', description: `${file.name} added to knowledge base.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Could not upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (file: KnowledgeFile) => {
    // Extract storage path from URL
    const pathMatch = file.file_url.match(/knowledge-files\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('knowledge-files').remove([pathMatch[1]]);
    }
    await supabase.from('knowledge_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast({ title: 'File removed' });
  };

  const handleAddWebPage = async () => {
    if (!newUrl.trim()) return;
    if (webPages.length >= MAX_WEB_PAGES) {
      toast({ title: 'Limit reached', description: `Maximum ${MAX_WEB_PAGES} web pages allowed.`, variant: 'destructive' });
      return;
    }

    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setAddingUrl(true);
    try {
      const { error } = await supabase.from('knowledge_web_pages').insert({
        project_id: projectId,
        url,
        title: new URL(url).hostname,
      });
      if (error) throw error;

      toast({ title: 'Web page added!', description: 'Page URL saved to knowledge base.' });
      setNewUrl('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not add page', variant: 'destructive' });
    } finally {
      setAddingUrl(false);
    }
  };

  const handleDeleteWebPage = async (pageId: string) => {
    await supabase.from('knowledge_web_pages').delete().eq('id', pageId);
    setWebPages(prev => prev.filter(p => p.id !== pageId));
    toast({ title: 'Page removed' });
  };

  const fetchWebPageContent = async (pageId: string) => {
    setFetchingPageId(pageId);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-web-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: pageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch page');
      toast({ title: 'Fetched', description: 'Web page content was fetched and saved.' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Fetch failed', description: err?.message || 'Could not fetch web page', variant: 'destructive' });
    } finally {
      setFetchingPageId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading knowledge base...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Knowledge Base Overview
          </CardTitle>
          <CardDescription>
            Upload files, add web pages, or enable web search to give your bot more context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{files.length}</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <Link2 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{webPages.length}<span className="text-sm font-normal text-muted-foreground">/{MAX_WEB_PAGES}</span></p>
              <p className="text-xs text-muted-foreground">Web Pages</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <Globe className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{webSearchEnabled ? 'On' : 'Off'}</p>
              <p className="text-xs text-muted-foreground">Web Search</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>File Storage Used</span>
              <span className={usagePercent > 90 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {formatBytes(totalFileSize)} / {formatBytes(MAX_FILE_SIZE)}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" /> File Uploads
          </CardTitle>
          <CardDescription>Upload .txt, .md, .csv, .json, .html, .xml, .pdf files (3MB total limit)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click to upload a file'}</p>
              <p className="text-xs text-muted-foreground mt-1">Max {formatBytes(MAX_FILE_SIZE - totalFileSize)} remaining</p>
              <input type="file" className="hidden" accept=".txt,.md,.csv,.json,.pdf,.html,.xml" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {files.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 group">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</p>
                    </div>
                    {file.content_text && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Parsed
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteFile(file)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Web Pages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Web Pages
            <Badge variant="outline" className="ml-auto text-xs">{webPages.length}/{MAX_WEB_PAGES}</Badge>
          </CardTitle>
          <CardDescription>Add specific web page URLs for your bot to reference (not counted toward 3MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/docs"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWebPage()}
              disabled={addingUrl || webPages.length >= MAX_WEB_PAGES}
            />
            <Button onClick={handleAddWebPage} disabled={addingUrl || !newUrl.trim() || webPages.length >= MAX_WEB_PAGES}>
              {addingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {webPages.length >= MAX_WEB_PAGES && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Maximum {MAX_WEB_PAGES} web pages reached.
            </div>
          )}

          {webPages.length > 0 && (
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-2">
                {webPages.map(page => (
                  <div key={page.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 group">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title || page.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                    </div>
                    {page.content_text && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Fetched
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => fetchWebPageContent(page.id)}
                      disabled={fetchingPageId === page.id}
                      title="Fetch content"
                    >
                      {fetchingPageId === page.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteWebPage(page.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Web Search Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Web Search
          </CardTitle>
          <CardDescription>Allow your bot to search the web for real-time information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Web Search</p>
              <p className="text-xs text-muted-foreground">Bot can search the web during conversations for up-to-date answers</p>
            </div>
            <Switch checked={webSearchEnabled} onCheckedChange={onToggleWebSearch} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
