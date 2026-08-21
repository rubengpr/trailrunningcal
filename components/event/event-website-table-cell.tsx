import { TableCell } from '@/components/ui/table';
import { cleanUrl } from '@/lib/utils/url';

interface EventWebsiteTableCellProps {
  url: string | null | undefined;
  missingLabel: string;
  missingClassName: string;
}

export function EventWebsiteTableCell({
  url,
  missingLabel,
  missingClassName,
}: EventWebsiteTableCellProps): React.ReactElement {
  return (
    <TableCell className="max-w-[180px]">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm text-gray-500 hover:text-gray-800 hover:underline"
        >
          {cleanUrl(url)}
        </a>
      ) : (
        <span className={missingClassName}>{missingLabel}</span>
      )}
    </TableCell>
  );
}
