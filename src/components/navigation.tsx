'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Menu,
  X,
  Briefcase,
  User,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <nav className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container mx-auto px-4'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <Link href='/' className='flex items-center space-x-2'>
            <Briefcase className='h-8 w-8 text-primary' />
            <span className='text-xl font-bold text-foreground'>C:Fit</span>
          </Link>

          {/* Desktop Search */}
          <div className='hidden md:flex flex-1 max-w-md mx-8'>
            <div className='relative w-full'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='기업명, 직무, 기술 스택 검색...'
                className='pl-10'
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-4'>
            {/* Theme Toggle */}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
              <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
            </Button>

            {user ? (
              <>
                <Link
                  href='/dashboard'
                  className='text-sm font-medium hover:text-primary transition-colors'
                >
                  대시보드
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm'>
                      <User className='h-4 w-4' />
                      <span className='ml-2 hidden lg:inline'>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className='mr-2 h-4 w-4' />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className='flex items-center space-x-2'>
                <Button variant='ghost' size='sm' asChild>
                  <Link href='/login'>로그인</Link>
                </Button>
                <Button size='sm' asChild>
                  <Link href='/register'>회원가입</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant='ghost'
            size='sm'
            className='md:hidden'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className='h-5 w-5' />
            ) : (
              <Menu className='h-5 w-5' />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className='md:hidden border-t py-4'>
            <div className='space-y-4'>
              {/* Mobile Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='기업명, 직무, 기술 스택 검색...'
                  className='pl-10'
                />
              </div>

              {/* Mobile Navigation Links */}
              <div className='space-y-2'>
                <Link
                  href='/jobs'
                  className='block py-2 text-sm font-medium hover:text-primary'
                >
                  채용공고
                </Link>

                <Link
                  href='/ai-match'
                  className='block py-2 text-sm font-medium hover:text-primary'
                >
                  AI 매칭
                </Link>

                {user ? (
                  <>
                    <Link
                      href='/dashboard'
                      className='block py-2 text-sm font-medium hover:text-primary'
                    >
                      대시보드
                    </Link>
                    <button
                      onClick={handleLogout}
                      className='block w-full text-left py-2 text-sm font-medium hover:text-primary'
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href='/login'
                      className='block py-2 text-sm font-medium hover:text-primary'
                    >
                      로그인
                    </Link>
                    <Link
                      href='/register'
                      className='block py-2 text-sm font-medium hover:text-primary'
                    >
                      회원가입
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
