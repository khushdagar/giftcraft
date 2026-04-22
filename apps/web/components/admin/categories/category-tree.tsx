'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  parentId: string | null;
  children?: Category[];
}

interface CategoryTreeProps {
  initialCategories: Category[];
}

export function CategoryTree({ initialCategories }: CategoryTreeProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const renderCategory = (cat: Category, level = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const isEditing = editingId === cat.id;

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 p-3 hover:bg-gray-50 rounded-lg group"
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(cat.id)}
              className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={() => saveEdit(cat.id)}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 text-sm font-medium text-gray-900">{cat.name}</div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                <button
                  onClick={() => startEdit(cat.id, cat.name)}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1 text-gray-600 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-6">
            {cat.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        {categories.map((cat) => renderCategory(cat))}
      </div>

      <Button asChild>
        <a href="/admin/categories/new">+ New Root Category</a>
      </Button>
    </div>
  );
}
