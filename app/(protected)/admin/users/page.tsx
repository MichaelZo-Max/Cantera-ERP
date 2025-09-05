"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { User } from "@/lib/types";
import {
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "CASHIER" as User["role"],
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setUsers(await res.json());
    } catch (e: any) {
      setApiError(e?.message ?? "Error al cargar usuarios");
      toast.error("Error al cargar usuarios", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "CASHIER",
      password: "",
    });
    setApiError(null);
    setShowDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "", // La contraseña no se edita directamente
    });
    setApiError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    const method = editingUser ? "PATCH" : "POST";
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    
    // Para usuarios nuevos, la contraseña es requerida
    const body = editingUser ? { name: formData.name, email: formData.email, role: formData.role, is_active: editingUser.is_active } : formData;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar el usuario");
      }

      await loadUsers(); // Recarga la lista para reflejar los cambios
      toast.success(`Usuario ${editingUser ? "actualizado" : "creado"} exitosamente.`);
      setShowDialog(false);

    } catch (err: any) {
      setApiError(err.message);
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const is_active = user.is_active;
    if (
      !confirm(
        `¿Estás seguro de que quieres ${
          is_active ? "desactivar" : "activar"
        } este usuario?`
      )
    ) {
      return;
    }
    
    const originalUsers = [...users];
    setUsers(
        users.map((u) => (u.id === user.id ? { ...u, is_active: !is_active } : u))
    );

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, is_active: !is_active }),
      });

      if (!res.ok) throw new Error(await res.text());
      
      toast.success(
        `Usuario ${!is_active ? "activado" : "desactivado"} exitosamente.`
      );
    } catch (err: any) {
      setUsers(originalUsers);
      toast.error("Error al cambiar el estado", { description: err.message });
    }
  };
  
  if (loading) {
    return (
      <AppLayout title="Gestión de Usuarios">
        <div className="p-6 text-center">Cargando usuarios...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gestión de Usuarios">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Usuarios del Sistema
                </h2>
                <p className="text-muted-foreground">
                  Administra las cuentas y roles de acceso
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
            <Sparkles className="h-4 w-4 ml-1" />
          </GradientButton>
        </div>

        {/* Search Bar */}
        <AnimatedCard hoverEffect="lift" className="glass">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Buscar por nombre o correo electrónico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg focus-ring"
              />
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Users Table */}
        <Card>
            <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>
                  Un total de {filteredUsers.length} usuarios encontrados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No se encontraron usuarios.
                            </TableCell>
                        </TableRow>
                    ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Actualiza la información del usuario."
                  : "Completa los datos para crear una nueva cuenta."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">
                  Nombre Completo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Juan Pérez"
                  required
                  className="focus-ring"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="ejemplo@cantera.com"
                    required
                    className="focus-ring"
                  />
                </div>
                {!editingUser && (
                   <div className="space-y-2">
                      <Label htmlFor="password">Contraseña *</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="focus-ring"
                      />
                      <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 6 caracteres.</p>
                   </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                   <Select
                    value={formData.role}
                    onValueChange={(value: User["role"]) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue placeholder="Seleccionar rol..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">Cajero</SelectItem>
                      <SelectItem value="YARD">Patio</SelectItem>
                      <SelectItem value="SECURITY">Vigilancia</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="REPORTS">Reportes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              {apiError && <p className="text-sm text-red-500">{apiError}</p>}
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <GradientButton type="submit" disabled={isSubmitting || !formData.name || !formData.email}>
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
    </AppLayout>
  );
}