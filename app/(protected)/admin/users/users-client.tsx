"use client";

import type React from "react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedCard } from "@/components/ui/animated-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmation } from "@/hooks/use-confirmation";
import { EmptyState } from "@/components/ui/empty-state";
import { createUserSchema, updateUserSchema } from "@/lib/validations"; // ✨ 2. Importar esquemas
import { cn } from "@/lib/utils";

// ✨ 3. Definir tipo para errores del formulario
type FormErrors = {
  name?: string[];
  email?: string[];
  role?: string[];
  password?: string[];
};

export function UsersClientUI({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "CASHIER",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({}); // ✨ 4. Estado para errores
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleNewUser = useCallback(() => {
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "CASHIER", password: "" });
    setFormErrors({}); // Limpiar errores
    setShowDialog(true);
  }, []);

  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setFormErrors({}); // Limpiar errores
    setShowDialog(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setFormErrors({});

      // ✨ 5. Elegir el esquema correcto y validar
      const schema = editingUser ? updateUserSchema : createUserSchema;
      const validation = schema.safeParse(formData);

      if (!validation.success) {
        setFormErrors(validation.error.flatten().fieldErrors);
        setIsSubmitting(false);
        toast.error("Error de validación", {
          description: "Por favor, corrige los campos marcados.",
        });
        return;
      }

      const body = validation.data;
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const responseData = await res.json();

        if (!res.ok) {
          // Si el backend devuelve errores de Zod (ej: email duplicado)
          if (res.status === 409 || res.status === 400) {
            setFormErrors(responseData);
          }
          throw new Error(responseData.email?.[0] || "Ocurrió un error al guardar.");
        }

        // Refrescar lista de usuarios para mantener UI sincronizada
        const fetchResponse = await fetch("/api/users");
        const updatedUsers = await fetchResponse.json();
        setUsers(updatedUsers);
        
        toast.success(`Usuario ${editingUser ? "actualizado" : "creado"} exitosamente.`);
        setShowDialog(false);
      } catch (err: any) {
        toast.error("Error al guardar", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingUser, formData]
  );

  // (handleToggleStatus se mantiene igual)
  const handleToggleStatus = useCallback(
    (user: User) => {
      const is_active = user.is_active;
      confirm(
        {
          title: `¿Estás seguro?`,
          description: `Esta acción ${
            is_active ? "desactivará" : "activará"
          } al usuario "${user.name}".`,
          confirmText: is_active ? "Desactivar" : "Activar",
          variant: is_active ? "destructive" : "default",
        },
        async () => {
          try {
            const res = await fetch(`/api/users/${user.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: !is_active }),
            });
            if (!res.ok) throw new Error(await res.text());
            const updatedUser = await res.json();
            setUsers((prevUsers) =>
              prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
            );
            toast.success(
              `Usuario ${!is_active ? "activado" : "desactivado"} exitosamente.`
            );
          } catch (err: any) {
            toast.error("Error al cambiar el estado", {
              description: err.message,
            });
          }
        }
      );
    },
    [confirm]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleCancel}
        title={options?.title || ""}
        description={options?.description || ""}
        onConfirm={handleConfirm}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
      />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Usuarios
              </h2>
              <p className="text-muted-foreground">
                Gestiona el acceso y los roles del personal
              </p>
            </div>
          </div>
        </div>
        <GradientButton
          onClick={handleNewUser}
          className="flex items-center space-x-2 animate-pulse-glow"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </GradientButton>
      </div>

      {/* Search Bar */}
      <AnimatedCard hoverEffect="lift" className="glass">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por name o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg focus-ring"
            />
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass">
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No hay usuarios registrados"
                  description="Gestiona los accesos al sistema creando el primer usuario."
                  action={
                    <GradientButton
                      onClick={handleNewUser}
                      className="flex items-center space-x-2 mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Crear Primer Usuario</span>
                    </GradientButton>
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <AnimatedCard
              key={user.id}
              hoverEffect="lift"
              animateIn
              delay={index * 100}
              className="glass overflow-hidden"
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-lg font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {user.name}
                      </p>
                      <Badge
                        variant={user.is_active ? "default" : "secondary"}
                        className={user.is_active ? "bg-gradient-primary" : ""}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">
                      {user.role}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="flex items-center space-x-1 flex-1 transition-smooth hover:bg-primary/5"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant={user.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(user)}
                    className="flex items-center space-x-1 transition-smooth"
                  >
                    {user.is_active ? (
                      <Trash2 className="h-3 w-3" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    <span>{user.is_active ? "Desactivar" : "Activar"}</span>
                  </Button>
                </div>
              </CardContent>
            </AnimatedCard>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza la información del usuario."
                : "Completa los datos para crear un nuevo usuario."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* --- CAMPO NOMBRE --- */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Ana Frank"
                className={cn(formErrors.name && "border-red-500", "focus-ring")}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.name[0]}
                </p>
              )}
            </div>

            {/* --- CAMPO EMAIL --- */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">
                Correo Electrónico <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="usuario@ejemplo.com"
                className={cn(formErrors.email && "border-red-500", "focus-ring")}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.email[0]}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* --- CAMPO ROL --- */}
              <div className="space-y-2">
                <Label htmlFor="role" className="font-semibold">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className={cn(formErrors.role && "border-red-500", "focus-ring")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="CASHIER">Cajero</SelectItem>
                    <SelectItem value="YARD_MANAGER">Jefe de Patio</SelectItem>
                    <SelectItem value="SECURITY">Vigilancia</SelectItem>
                    <SelectItem value="REPORTS">Reportes</SelectItem>
                  </SelectContent>
                </Select>
                 {formErrors.role && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.role[0]}
                    </p>
                 )}
              </div>

              {/* --- CAMPO CONTRASEÑA --- */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "Nueva Contraseña" : "Contraseña"}
                   {!editingUser && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={editingUser ? "Dejar en blanco para no cambiar" : "••••••••"}
                  className={cn(formErrors.password && "border-red-500", "focus-ring")}
                />
                {formErrors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {formErrors.password[0]}
                    </p>
                 )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <GradientButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSkeleton className="w-4 h-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                  </>
                )}
              </GradientButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}