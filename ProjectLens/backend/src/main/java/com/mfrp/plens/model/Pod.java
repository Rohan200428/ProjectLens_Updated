package com.mfrp.plens.model;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "pods")
public class Pod extends BaseEntity {
    @Column(nullable = false, unique = true, length = 100)
    private String name;
}
