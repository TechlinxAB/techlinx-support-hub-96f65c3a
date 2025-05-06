
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { language, setLanguage } = useAppContext();
  const today = new Date();
  
  return (
    <header className="bg-white dark:bg-card border-b border-border h-16 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {format(today, 'EEEE, MMMM d, yyyy')}
        <span className="ml-2 text-xs">
          {format(today, 'HH:mm')}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white">
            2
          </span>
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => setLanguage(language === 'en' ? 'sv' : 'en')}
          className="text-sm"
        >
          {language === 'en' ? 'SV' : 'EN'}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 bg-muted">
              <span className="font-medium text-xs">TH</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              My Account
              <div className="text-xs text-muted-foreground">admin@techlinx.com</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
