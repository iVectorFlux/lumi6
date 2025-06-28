import { ReactNode } from 'react';
import { LucideIcon, Mic, BookOpen, Brain, PenTool } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { designTokens } from '@/design-system/tokens';
import { cn } from '@/lib/utils';

interface TestTypeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange';
  enabled?: boolean;
  creditsRequired?: number;
  creditsAvailable?: number;
  onCreateTest: () => void;
  className?: string;
}

export const TestTypeCard = ({
  title,
  description,
  icon: Icon,
  color,
  enabled = true,
  creditsRequired = 1,
  creditsAvailable = 0,
  onCreateTest,
  className
}: TestTypeCardProps) => {
  const colorClasses = {
    blue: {
      icon: 'bg-blue-600 text-white',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      text: 'text-blue-900',
      subtitle: 'text-blue-700',
    },
    green: {
      icon: 'bg-green-600 text-white',
      button: 'bg-green-600 hover:bg-green-700 text-white',
      text: 'text-green-900',
      subtitle: 'text-green-700',
    },
    purple: {
      icon: 'bg-purple-600 text-white',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
      text: 'text-purple-900',
      subtitle: 'text-purple-700',
    },
    orange: {
      icon: 'bg-orange-600 text-white',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      text: 'text-orange-900',
      subtitle: 'text-orange-700',
    },
  };

  const canCreateTest = enabled && creditsAvailable >= creditsRequired;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      !enabled && 'opacity-50',
      className
    )}>
      <CardContent className="p-6 text-center">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
          colorClasses[color].icon
        )}>
          <Icon className="h-8 w-8" />
        </div>
        
        <h4 className={cn(
          designTokens.typography.heading4,
          colorClasses[color].text,
          'mb-2'
        )}>
          {title}
        </h4>
        
        <p className={cn(
          designTokens.typography.bodySmall,
          colorClasses[color].subtitle,
          'mb-4'
        )}>
          {description}
        </p>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            {creditsRequired} credit{creditsRequired !== 1 ? 's' : ''} required
          </Badge>
          <Badge variant={creditsAvailable >= creditsRequired ? 'default' : 'destructive'} className="text-xs">
            {creditsAvailable} available
          </Badge>
        </div>

        <Button
          onClick={onCreateTest}
          disabled={!canCreateTest}
          className={cn(
            'w-full',
            canCreateTest ? colorClasses[color].button : ''
          )}
          variant={canCreateTest ? 'default' : 'outline'}
        >
          Create Test
        </Button>

        {!enabled && (
          <p className="text-xs text-gray-500 mt-2">
            Test type not enabled for your company
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface TestTypeCardsProps {
  permissions: string[];
  creditBalances: Array<{ testType: string; remainingCredits: number }>;
  onCreateProficiencyTest: () => void;
  onCreateEQTest: () => void;
  onCreateSpeakingTest: () => void;
  onCreateWritingTest: () => void;
  className?: string;
}

export const TestTypeCards = ({
  permissions,
  creditBalances,
  onCreateProficiencyTest,
  onCreateEQTest,
  onCreateSpeakingTest,
  onCreateWritingTest,
  className
}: TestTypeCardsProps) => {
  const getCreditsForTestType = (testType: string) => {
    const balance = creditBalances.find(b => b.testType === testType);
    return balance?.remainingCredits || 0;
  };

  const testTypes = [
    {
      key: 'proficiency',
      title: 'Proficiency Test',
      description: 'Comprehensive reading and comprehension assessment',
      icon: BookOpen,
      color: 'green' as const,
      onCreateTest: onCreateProficiencyTest,
    },
    {
      key: 'eq',
      title: 'EQ Assessment',
      description: 'Measure emotional intelligence and interpersonal skills',
      icon: Brain,
      color: 'purple' as const,
      onCreateTest: onCreateEQTest,
    },
    {
      key: 'speaking',
      title: 'Speaking Assessment',
      description: 'Evaluate oral communication skills with AI-powered analysis',
      icon: Mic,
      color: 'blue' as const,
      onCreateTest: onCreateSpeakingTest,
    },
    {
      key: 'writing',
      title: 'Writing Assessment',
      description: 'Assess written communication and language proficiency',
      icon: PenTool,
      color: 'orange' as const,
      onCreateTest: onCreateWritingTest,
    },
  ];

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
      className
    )}>
      {testTypes.map((testType) => (
        <TestTypeCard
          key={testType.key}
          title={testType.title}
          description={testType.description}
          icon={testType.icon}
          color={testType.color}
          enabled={permissions.includes(testType.key)}
          creditsAvailable={getCreditsForTestType(testType.key)}
          onCreateTest={testType.onCreateTest}
        />
      ))}
    </div>
  );
}; 