import { z } from 'zod';

export const sedeSchema = z.object({
  nombre: z.string()
    .trim()
    .min(4, 'El nombre debe tener al menos 4 caracteres.'),
  direccion: z.string()
    .trim()
    .min(1, 'La dirección física es obligatoria.'),
  telefono: z.string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
      return phoneRegex.test(val);
    }, {
      message: 'Formato de teléfono inválido (ej: +584121234567).',
    }),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
  imagen_url: z.string().trim().optional().or(z.literal('')),
});

export type SedeFormInput = z.infer<typeof sedeSchema>;
