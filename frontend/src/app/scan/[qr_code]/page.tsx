'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { roomsAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Universal QR code entry page.
 * When a user scans the door QR code sticker they land here.
 * The page reads the stored user role and redirects to the correct action:
 *   - admin/manager/teacher → Attendance check-in page
 *   - student               → Maintenance request page (with room pre-filled)
 *   - unauthenticated       → Login page (with redirect back)
 */
export default function QRScanEntryPage() {
  const router = useRouter();
  const params = useParams();
  const qrCode = decodeURIComponent(params.qr_code as string);

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const ud = localStorage.getItem('user');
    if (!ud) {
      // Not logged in — redirect to login, come back after
      router.replace(`/login?redirect=/scan/${encodeURIComponent(qrCode)}`);
      return;
    }
    const u = JSON.parse(ud);
    setUserRole(u.role);
    loadRoom(u.role);
  }, [qrCode, router]);

  const loadRoom = async (role: string) => {
    setLoading(true);
    try {
      const res = await roomsAPI.getByQrCode(qrCode);
      if (res.success && res.data) {
        setRoom(res.data);
        // Auto-redirect based on role
        if (['admin', 'manager', 'teacher'].includes(role)) {
          router.replace(`/dashboard/attendance/scan?qr=${encodeURIComponent(qrCode)}`);
        } else {
          router.replace(`/dashboard/student/maintenance?qr=${encodeURIComponent(qrCode)}`);
        }
      } else {
        setError('This QR code does not match any registered room. Please contact administration.');
        setLoading(false);
      }
    } catch {
      setError('Failed to load room information.');
      setLoading(false);
    }
  };

  if (loading && !error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white">
      <div className="text-center">
        <div className="text-6xl mb-4">📱</div>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">Reading QR code...</p>
        <p className="text-gray-400 text-sm mt-1">{qrCode}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h2 className="text-xl font-bold text-gray-900">QR Code Not Found</h2>
          <p className="text-gray-600 text-sm">{error}</p>
          <code className="block text-xs text-gray-400 bg-gray-50 p-2 rounded">{qrCode}</code>
          <Button className="w-full" onClick={() => router.push('/dashboard/student')}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
