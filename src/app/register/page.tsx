'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 새로고침 방지
    setLoading(true); // 로딩 상태 설정 -> 버튼 비활성화 급해서 여러번 누르면 안되니까
    setError(''); // 에러 초기화
    setSuccess('');

    const result = await register(email, password, name);

    if (result) {
      setSuccess('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError('회원가입 중 오류가 발생했습니다.');
    }

    setLoading(false);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>회원가입</CardTitle>
          <CardDescription>AI 맞춤 채용 플랫폼에 가입하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>이름</Label>
              <Input
                id='name'
                type='text'
                placeholder='김씨핏'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>이메일</Label>
              <Input
                id='email'
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>비밀번호</Label>
              <Input
                id='password'
                type='password'
                placeholder='비밀번호를 입력하세요'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className='text-sm text-red-600 bg-red-50 p-3 rounded-md'>
                {error}
              </div>
            )}
            {success && (
              <div className='text-sm text-green-600 bg-green-50 p-3 rounded-md'>
                {success}
              </div>
            )}
            <Button type='submit' className='w-full' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              회원가입
            </Button>
          </form>
          <div className='mt-6 text-center text-sm'>
            <span className='text-muted-foreground'>
              이미 계정이 있으신가요?{' '}
            </span>
            <Link href='/login' className='text-primary hover:underline'>
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
