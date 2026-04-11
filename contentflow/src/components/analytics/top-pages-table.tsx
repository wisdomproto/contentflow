'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GA4TopPage } from '@/types/analytics';

interface TopPagesTableProps {
  data: GA4TopPage[];
  websiteUrl?: string;
}

export function TopPagesTable({ data, websiteUrl }: TopPagesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">인기 페이지 TOP 10</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 font-semibold">페이지</th>
                <th className="text-right py-2 font-semibold">뷰</th>
                <th className="text-right py-2 font-semibold">사용자</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((page, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2">
                    <div className="font-medium text-xs truncate max-w-[300px]">
                      {page.title || page.path}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {websiteUrl ? `${websiteUrl}${page.path}` : page.path}
                    </div>
                  </td>
                  <td className="text-right font-bold tabular-nums">{page.views.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-muted-foreground">{page.users.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
