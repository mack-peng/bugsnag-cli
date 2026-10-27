import * as z from 'zod';
import type zodType from 'zod';

export type Category =
  | 'organizations'
  | 'projects'
  | 'errors'
  | 'events'
  | 'analysis'
  | 'config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HelpEntry {
  help: string;
  flags: Record<string, 'boolean' | 'string'>;
  args: string[];
  raw?: boolean;
  list?: boolean;
}

export interface HelpData {
  global: string;
  commands: Record<string, HelpEntry>;
  booleanOptions: string[];
}

/** Args visible to path/transformRequest: declared args + options + injected ctx. */
export type CommandArgs<Args extends zodType.ZodTypeAny, Options extends zodType.ZodTypeAny> =
  z.infer<Args> & z.infer<Options> & { organization?: string; organizationId?: string; project?: string; projectId?: string };

export type CommandSchema<Args extends zodType.ZodTypeAny, Options extends zodType.ZodTypeAny> = {
  name: string;
  category: Category;
  description: string;
  hidden?: boolean;
  raw?: boolean;
  list?: boolean;
  upload?: boolean;
  jsonFile?: boolean;
  /**
   * How the command consumes the `--project` flag (and default project config):
   * - 'slug': inject project slug (default from config) into parsed args for path construction.
   * - 'id': resolve project (24-hex id or name/slug) -> project ID and inject as `projectId`.
   */
  project?: 'slug' | 'id';
  /** Resolve the `--organization` flag (default from config) to an organization ID (`organizationId`). */
  organization?: 'id';
  args?: Args;
  options?: Options;
  api: {
    method: HttpMethod;
    path: string | ((args: CommandArgs<Args, Options>) => string);
  };
  transformRequest?: (args: CommandArgs<Args, Options>) => any;
  transformResponse?: (data: any) => any;
};

export type AnyCommandSchema = CommandSchema<any, any>;

export function declareCommand<Args extends zodType.ZodTypeAny, Options extends zodType.ZodTypeAny>(
  command: CommandSchema<Args, Options>
): CommandSchema<Args, Options> {
  return command;
}

const kEmptyOptions = z.object({});
const kEmptyArgs = z.object({});

export function parseCommand(
  command: AnyCommandSchema,
  args: Record<string, string> & { _: string[] }
): Record<string, any> {
  const optionsObject = { ...args } as Record<string, string>;
  delete optionsObject['_'];
  const optionsSchema = (command.options ?? kEmptyOptions).strict();
  const options: Record<string, any> = zodParse(optionsSchema, optionsObject, 'option');

  const argsSchema = (command.args ?? kEmptyArgs).strict();
  const argNames = [...Object.keys(argsSchema.shape)];
  const argv = args['_'].slice(1);
  if (argv.length > argNames.length)
    throw new Error(`error: too many arguments: expected ${argNames.length}, received ${argv.length}`);
  const argsObject: Record<string, string> = {};
  argNames.forEach((name, index) => (argsObject[name] = argv[index]));
  const parsedArgs: Record<string, any> = zodParse(argsSchema, argsObject, 'argument');

  return { ...parsedArgs, ...options };
}

function zodParse(schema: zodType.ZodAny, data: unknown, type: 'option' | 'argument'): any {
  try {
    return schema.parse(data);
  } catch (e) {
    throw new Error(
      (e as zodType.ZodError).issues
        .map((issue) => {
          const keys: string[] = issue.code === 'unrecognized_keys' ? issue.keys : [''];
          const props = keys.map((key) => [...issue.path, key].filter(Boolean).join('.'));
          return props.map((prop) => {
            const label = type === 'option' ? `'--${prop}' option` : `'${prop}' argument`;
            switch (issue.code) {
              case 'invalid_type':
                return 'error: ' + label + ': ' + issue.message.replace(/Invalid input:/, '').trim();
              case 'unrecognized_keys':
                return 'error: unknown ' + label;
              default:
                return 'error: ' + label + ': ' + issue.message;
            }
          });
        })
        .flat()
        .join('\n')
    );
  }
}
