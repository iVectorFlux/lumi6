import { Card, CardContent } from '@/components/ui/card';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Mail } from 'lucide-react';
import React from 'react';

interface RowProps { label: string; value: React.ReactNode; mono?: boolean; }
const Row = ({ label, value, mono }: RowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium text-gray-700">{label}:</span>
    <span className={`text-sm ${mono ? 'font-mono bg-gray-100 px-2 py-1 rounded' : ''}`}>{value}</span>
  </div>
);

export interface CredentialsProps {
  accentColor: string; // e.g. 'blue-600'
  icon: React.ReactNode;
  heading: string;
  candidateName: string;
  login: string;
  password: string;
  testId?: string;
  testLink: string;
  instructions: string[];
  onCopy: () => void;
  onSend: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}

const TestCredentialsCard: React.FC<CredentialsProps> = ({
  accentColor,
  icon,
  heading,
  candidateName,
  login,
  password,
  testId,
  testLink,
  instructions,
  onCopy,
  onSend,
  onCreateAnother,
  onClose
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-${accentColor}/20`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold">{heading}</h3>
        <p className="text-sm text-gray-600">Test credentials have been generated for {candidateName}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Row label="Candidate" value={candidateName} />
          <Row label="Login ID" value={login} mono />
          <Row label="Password" value={password} mono />
          {testId && <Row label="Test ID" value={testId} mono />}
          <div className="pt-2 border-t">
            <Row
              label="Test Link"
              value={
                <a href={testLink} target="_blank" rel="noopener noreferrer" className={`text-${accentColor} flex items-center gap-1 max-w-xs break-all`}>
                  {testLink}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              }
            />
          </div>
        </CardContent>
      </Card>

      {instructions && instructions.length > 0 && (
        <div className={`p-4 rounded-lg border bg-${accentColor}/10 border-${accentColor}/30`}>
          <div className={`font-medium text-${accentColor}`}>Instructions for Candidate</div>
          <ul className="mt-1 text-sm text-gray-700 list-disc list-inside space-y-1">
            {instructions.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      <DialogFooter className="gap-2 flex-wrap">
        <Button variant="outline" onClick={onCopy}><Copy className="h-4 w-4 mr-2" />Copy Credentials</Button>
        <Button variant="outline" onClick={onSend}><Mail className="h-4 w-4 mr-2" />Send Email</Button>
        <Button onClick={onCreateAnother}>Create Another</Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
};

export default TestCredentialsCard; 