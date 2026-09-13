import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/app/components/ui/command';

describe('shadcn ui primitives', () => {
  it('renders a Button', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders a labeled Input', () => {
    render(
      <>
        <Label htmlFor="q">Query</Label>
        <Input id="q" />
      </>
    );
    expect(screen.getByLabelText('Query')).toBeInTheDocument();
  });

  it('renders a Switch', () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole('switch', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('opens a Dialog', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>My dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'My dialog' })).toBeInTheDocument();
  });

  it('opens a Popover', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Filters</Button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByText('Popover body')).toBeInTheDocument();
  });

  it('renders a Command list', () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem>Fight Club</CommandItem>
        </CommandList>
      </Command>
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
  });
});
