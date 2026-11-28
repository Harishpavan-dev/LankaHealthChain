import { IsBoolean, IsISO8601, IsString, ValidateIf, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
export class DoctorStatusDto {
 @ValidateIf((_obj,value)=>value!==undefined) @IsBoolean() active?:boolean;
 @ValidateIf((_obj,value)=>value!==undefined) @IsBoolean() verified?:boolean;
 @Transform(({value})=>typeof value==='string'?value.trim():value)
 @ValidateIf((_obj,value)=>value!==undefined) @IsString() @Length(3,120) displayName?:string;
}
export class EnrollOperatorDto {
 @IsString() @Matches(/^[a-z][a-z0-9-]{1,31}$/) hospitalCode!:string;
 @IsString() @Length(5,128) authSubject!:string;
}
export class CreateResearchGrantDto {
 @IsString() @Length(5,128) authSubject!:string;
 @IsString() @Length(5,120) projectName!:string;
 @IsString() @Length(10,500) purpose!:string;
 @IsISO8601() expiresAt!:string;
}

export class ResourceStatusDto {
 @IsBoolean() active!:boolean;
}

export class EnrollDoctorDto {
 @IsString() @Length(5,128) authSubject!:string;
 @Transform(({value})=>typeof value==='string'?value.trim():value)
 @IsString() @Length(3,120) displayName!:string;
}
