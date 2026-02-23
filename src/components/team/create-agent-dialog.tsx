'use client';

import { useState } from 'react';
import { X, Plus, XCircle, CheckCircle, Save } from 'lucide-react';

interface CreateAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}

const roleOptions = [
  { value: 'developer', label: 'Developer', icon: '💻', color: 'bg-blue-100' },
  { value: 'reviewer', label: 'Reviewer', icon: '👁', color: 'bg-purple-100' },
  { value: 'tester', label: 'Tester', icon: '🧪', color: 'bg-green-100' },
  { value: 'deployer', label: 'Deployer', icon: '🚀', color: 'bg-orange-100' },
  { value: 'admin', label: 'Admin', icon: '👑', color: 'bg-red-100' },
];

const capabilityOptions = [
  { value: 'code', label: 'Coding' },
  { value: 'review', label: 'Code Review' },
  { value: 'debug', label: 'Debugging' },
  { value: 'test', label: 'Testing' },
  { value: 'deploy', label: 'Deployment' },
  { value: 'monitor', label: 'Monitoring' },
  { value: 'documentation', label: 'Documentation' },
];

export function CreateAgentDialog({ isOpen, onClose, onCreate }: CreateAgentDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('developer');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(['code']);
  const [configNotes, setConfigNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    name: false,
    role: false,
  capabilities: false,
  });

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = { name: false, role: false, capabilities: false };
    if (!name.trim()) {
      newErrors.name = true;
    }
    if (!role) {
      newErrors.role = true;
    }
    if (selectedCapabilities.length === 0) {
      newErrors.capabilities = true;
    }
    setErrors(newErrors);
    return Object.values(newErrors).some(Boolean);
  };

  const handleToggleCapability = (capability: string) => {
    if (selectedCapabilities.includes(capability)) {
      setSelectedCapabilities(selectedCapabilities.filter(c => c !== capability));
    } else {
      setSelectedCapabilities([...selectedCapabilities, capability]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        role,
        capabilities: selectedCapabilities,
        config: {
          role,
          capabilities: selectedCapabilities,
          notes: configNotes,
          createdAt: new Date().toISOString(),
        },
      });

      // Reset form
      setName('');
      setRole('developer');
      setSelectedCapabilities(['code']);
      setConfigNotes('');
      setErrors({ name: false, role: false, capabilities: false });
      onClose();
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Plus className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Agent</h2>
              <p className="text-sm text-gray-500">Add a new AI agent to your team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({ ...errors, name: false });
              }}
              placeholder="e.g., code_master, review_bot"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.name
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500 bg-white'
              }`}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">Agent name is required</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value);
                    setErrors({ ...errors, role: false });
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    role === option.value
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                      : 'bg-white border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">{option.icon}</span>
                    <span className={`text-sm font-medium ${
                      role === option.value
                        ? 'text-blue-700'
                        : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  {role === option.value && (
                    <CheckCircle className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="text-sm text-red-600 mt-1">Please select a role</p>
            )}
          </div>

          {/* Capabilities Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capabilities <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal">(select at least one)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {capabilityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleCapability(option.value)}
                  className={`p-3 border-2 rounded-lg transition-all flex items-center justify-between ${
                    selectedCapabilities.includes(option.value)
                      ? `border-blue-500 ${option.color}`
                      : 'bg-white border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      selectedCapabilities.includes(option.value)
                        ? 'text-blue-700'
                        : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  {selectedCapabilities.includes(option.value) && (
                    <div className={`p-1 rounded-full ${option.color}`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {errors.capabilities && (
              <p className="text-sm text-red-600 mt-1">Please select at least one capability</p>
            )}
          </div>

          {/* Config Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration Notes
            </label>
            <textarea
              value={configNotes}
              onChange={(e) => setConfigNotes(e.target.value)}
              placeholder="Any additional configuration for this agent..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              This information will be stored in the agent's configuration object
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Agent Configuration</p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Name:</strong> {name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Role:</strong> {roleOptions.find(r => r.value === role)?.label}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Capabilities:</strong> {selectedCapabilities.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
