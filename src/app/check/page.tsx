'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast'; 

export default function TestPage() {
  const { toast } = useToast();

  return (
    <div className='p-10'>
      <Button
        onClick={() => {
          toast({
            title: '토스트 테스트',
            description: '이게 잘 보이면 성공입니다!',
            variant: 'destructive',
          });
        }}
      >
        토스트 띄우기
      </Button>
    </div>
  );
}
